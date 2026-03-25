from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from .utils import Generator, PlotUtils


class PlotCore:
    @staticmethod
    def _callable_name(generator: Generator, fallback: str = "function") -> str:
        """Return a readable name for a callable."""
        name = getattr(generator, "__name__", "") or ""
        if name and name != "<lambda>":
            return name
        return fallback

    @staticmethod
    def _is_integral(value: int | float) -> bool:
        """Return True when a numeric value can be represented as an integer."""
        return float(value).is_integer()

    @classmethod
    def _resolve_step(
        cls, start: int, end: int, step: int | float, max_points: int
    ) -> int | float:
        """Combine the requested step with auto-sampling limits."""
        if step == 0:
            raise ValueError("step must be non-zero.")
        if max_points < 1:
            raise ValueError("max_points must be at least 1.")

        distance = end - start
        if distance != 0 and distance * step < 0:
            raise ValueError("step must move from start toward end.")

        direction = 1 if step > 0 else -1
        minimum_step = PlotUtils.auto_step(start, end, max_points)
        return direction * max(abs(step), minimum_step)

    @classmethod
    def _build_x_values(
        cls,
        start: int,
        end: int,
        step: int | float,
        max_points: int,
    ) -> np.ndarray:
        """Create the plotted x values while keeping the total count manageable."""
        effective_step = cls._resolve_step(start, end, step, max_points)
        dtype: type[int] | type[float] = int
        if not all(cls._is_integral(value) for value in (start, end, effective_step)):
            dtype = float

        if start == end:
            return np.asarray([start], dtype=dtype)

        stop = end + (effective_step * 0.5)
        x_values = np.arange(start, stop, effective_step, dtype=dtype)
        if x_values.size == 0:
            raise ValueError("Range produced no points to plot.")
        return x_values

    @staticmethod
    def _filter_for_scale(
        x_values: np.ndarray, y_values: np.ndarray, scale: str
    ) -> tuple[np.ndarray, np.ndarray]:
        """Drop invalid points for the requested scale."""
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

    @staticmethod
    def _add_horizontal_lines(
        ax: Axes, horizontal_lines: Mapping[str, int | float] | None
    ) -> None:
        """Draw labeled horizontal reference lines on an axes."""
        if not horizontal_lines:
            return

        for label, value in horizontal_lines.items():
            ax.axhline(
                float(value), linestyle="--", linewidth=1.5, alpha=0.8, label=label
            )

    @classmethod
    def _finish_plot(
        cls,
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
        """Apply shared formatting, save if requested, and optionally display the plot."""
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, linestyle="--", alpha=0.4)
        PlotUtils.maybe_log_scale(ax, scale)
        fig.tight_layout()

        if save_path is not None:
            path = Path(save_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(path, bbox_inches="tight")

        if show:
            plt.show()

        return fig, ax

    @classmethod
    def plot_fn(
        cls,
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
        x_values = cls._build_x_values(start, end, step, max_points)
        y_values = PlotUtils.safe_vectorize(generator, x_values)
        plot_x, plot_y = cls._filter_for_scale(x_values, y_values, scale)

        fig, ax = plt.subplots()
        ax.plot(plot_x, plot_y)

        generator_name = cls._callable_name(generator)
        resolved_title = title or f"Plot of {generator_name}"
        resolved_ylabel = ylabel or "f(n)"
        return cls._finish_plot(
            fig,
            ax,
            scale=scale,
            title=resolved_title,
            xlabel=xlabel,
            ylabel=resolved_ylabel,
            save_path=save_path,
            show=show,
        )

    @classmethod
    def plot_many(
        cls,
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

        x_values = cls._build_x_values(start, end, step, max_points)
        fig, ax = plt.subplots()

        for label, generator in generators.items():
            y_values = PlotUtils.safe_vectorize(generator, x_values)
            plot_x, plot_y = cls._filter_for_scale(x_values, y_values, scale)
            ax.plot(plot_x, plot_y, label=label)

        cls._add_horizontal_lines(ax, horizontal_lines)
        ax.legend()
        resolved_title = title or "Function comparison"
        resolved_ylabel = ylabel or "value"
        return cls._finish_plot(
            fig,
            ax,
            scale=scale,
            title=resolved_title,
            xlabel=xlabel,
            ylabel=resolved_ylabel,
            save_path=save_path,
            show=show,
        )

    @classmethod
    def plot_diff(
        cls,
        generator: Generator,
        start: int,
        end: int,
        step: int | float = 1,
        scale: str = "linear",
        *,
        save_path: str | Path | None = None,
        title: str | None = None,
        xlabel: str = "n",
        ylabel: str | None = None,
        show: bool = True,
    ) -> tuple[Figure, Axes]:
        """Plot the forward difference f(n + 1) - f(n) over an inclusive range."""

        def forward_difference(x_values: np.ndarray) -> np.ndarray:
            current = PlotUtils.safe_vectorize(generator, x_values)
            next_values = PlotUtils.safe_vectorize(generator, x_values + 1)
            return next_values - current

        generator_name = cls._callable_name(generator)
        resolved_title = title or f"Forward difference of {generator_name}"
        resolved_ylabel = ylabel or "f(n + 1) - f(n)"
        return cls.plot_fn(
            forward_difference,
            start,
            end,
            step=step,
            scale=scale,
            max_points=10000,
            save_path=save_path,
            title=resolved_title,
            xlabel=xlabel,
            ylabel=resolved_ylabel,
            show=show,
        )


plot_fn = PlotCore.plot_fn
plot_many = PlotCore.plot_many
plot_diff = PlotCore.plot_diff

__all__ = ["PlotCore", "plot_diff", "plot_fn", "plot_many"]
