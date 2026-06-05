from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from .utils import Generator, auto_step, maybe_log_scale, safe_vectorize


def _callable_name(generator: Generator, fallback: str = "function") -> str:
    name = getattr(generator, "__name__", "") or ""
    if name and name != "<lambda>":
        return name
    return fallback


def _resolve_step(
    start: int, end: int, step: int | float, max_points: int
) -> int | float:
    if step == 0:
        raise ValueError("step must be non-zero.")
    if max_points < 1:
        raise ValueError("max_points must be at least 1.")

    distance = end - start
    if distance != 0 and distance * step < 0:
        raise ValueError("step must move from start toward end.")

    direction = 1 if step > 0 else -1
    minimum_step = auto_step(start, end, max_points)
    return direction * max(abs(step), minimum_step)


def _build_x_values(
    start: int, end: int, step: int | float, max_points: int
) -> np.ndarray:
    effective_step = _resolve_step(start, end, step, max_points)
    dtype: type[int] | type[float] = int
    if not all(float(v).is_integer() for v in (start, end, effective_step)):
        dtype = float

    if start == end:
        return np.asarray([start], dtype=dtype)

    stop = end + (effective_step * 0.5)
    x_values = np.arange(start, stop, effective_step, dtype=dtype)
    if x_values.size == 0:
        raise ValueError("Range produced no points to plot.")
    return x_values


def _filter_for_scale(
    x_values: np.ndarray, y_values: np.ndarray, scale: str
) -> tuple[np.ndarray, np.ndarray]:
    x_array = np.asarray(x_values, dtype=float)
    y_array = np.asarray(y_values, dtype=float)
    if x_array.shape != y_array.shape:
        raise ValueError("generator must return one value per x input.")

    mask = np.isfinite(x_array) & np.isfinite(y_array)
    if scale in {"log", "loglog"}:
        mask &= y_array > 0
    if scale == "loglog":
        mask &= x_array > 0

    filtered_x = x_array[mask]
    filtered_y = y_array[mask]
    if filtered_x.size == 0:
        raise ValueError(f"Scale {scale!r} leaves no plottable points.")
    return filtered_x, filtered_y


def _finish_plot(
    fig: Figure,
    ax: Axes,
    *,
    scale: str,
    title: str,
    xlabel: str,
    ylabel: str,
    save_path: str | Path | None,
    show: bool,
) -> tuple[Figure, Axes]:
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.grid(True, linestyle="--", alpha=0.4)
    maybe_log_scale(ax, scale)
    fig.tight_layout()

    if save_path is not None:
        path = Path(save_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(path, bbox_inches="tight")

    if show:
        plt.show()

    return fig, ax


def plot_fn(
    generator: Generator,
    start: int,
    end: int,
    step: int | float = 1,
    scale: str = "linear",
    max_points: int = 10000,
    *,
    save_path: str | Path | None = None,
    title: str | None = None,
    xlabel: str = "n",
    ylabel: str | None = None,
    show: bool = True,
) -> tuple[Figure, Axes]:
    """Plot a single mathematical function or sequence over an inclusive range."""
    x_values = _build_x_values(start, end, step, max_points)
    y_values = safe_vectorize(generator, x_values)
    plot_x, plot_y = _filter_for_scale(x_values, y_values, scale)

    fig, ax = plt.subplots()
    ax.plot(plot_x, plot_y)

    generator_name = _callable_name(generator)
    return _finish_plot(
        fig,
        ax,
        scale=scale,
        title=title or f"Plot of {generator_name}",
        xlabel=xlabel,
        ylabel=ylabel or "f(n)",
        save_path=save_path,
        show=show,
    )


def plot_many(
    generators: Mapping[str, Generator],
    start: int,
    end: int,
    step: int | float = 1,
    scale: str = "linear",
    max_points: int = 10000,
    *,
    save_path: str | Path | None = None,
    title: str | None = None,
    xlabel: str = "n",
    ylabel: str | None = None,
    horizontal_lines: Mapping[str, int | float] | None = None,
    show: bool = True,
) -> tuple[Figure, Axes]:
    """Plot multiple generators with shared sampling logic and optional guide lines."""
    if not generators:
        raise ValueError("generators must contain at least one labeled function.")

    x_values = _build_x_values(start, end, step, max_points)
    fig, ax = plt.subplots()

    for label, generator in generators.items():
        y_values = safe_vectorize(generator, x_values)
        plot_x, plot_y = _filter_for_scale(x_values, y_values, scale)
        ax.plot(plot_x, plot_y, label=label)

    if horizontal_lines:
        for label, value in horizontal_lines.items():
            ax.axhline(
                float(value), linestyle="--", linewidth=1.5, alpha=0.8, label=label
            )

    ax.legend()
    return _finish_plot(
        fig,
        ax,
        scale=scale,
        title=title or "Function comparison",
        xlabel=xlabel,
        ylabel=ylabel or "value",
        save_path=save_path,
        show=show,
    )


def plot_diff(
    generator: Generator,
    start: int,
    end: int,
    step: int | float = 1,
    scale: str = "linear",
    max_points: int = 10000,
    *,
    save_path: str | Path | None = None,
    title: str | None = None,
    xlabel: str = "n",
    ylabel: str | None = None,
    show: bool = True,
) -> tuple[Figure, Axes]:
    """Plot the forward difference f(n + 1) - f(n) over an inclusive range."""

    def forward_difference(x_values: np.ndarray) -> np.ndarray:
        current = safe_vectorize(generator, x_values)
        next_values = safe_vectorize(generator, x_values + 1)
        return next_values - current

    generator_name = _callable_name(generator)
    return plot_fn(
        forward_difference,
        start,
        end,
        step=step,
        scale=scale,
        max_points=max_points,
        save_path=save_path,
        title=title or f"Forward difference of {generator_name}",
        xlabel=xlabel,
        ylabel=ylabel or "f(n + 1) - f(n)",
        show=show,
    )


__all__ = ["plot_diff", "plot_fn", "plot_many"]
