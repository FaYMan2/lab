from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

import numpy as np
from matplotlib.axes import Axes

Generator = Callable[[Any], Any]


class PlotUtils:
    VALID_SCALES = {"linear", "log", "loglog"}

    @staticmethod
    def _coerce_array(values: Any, x: np.ndarray) -> np.ndarray:
        array = np.asarray(values, dtype=float)
        if array.shape == ():
            return np.full(x.shape, float(array))
        if array.shape == x.shape:
            return array
        if array.size == x.size:
            return array.reshape(x.shape)
        raise ValueError("generator must return one numeric value per x input.")

    @classmethod
    def safe_vectorize(cls, generator: Generator, x: np.ndarray) -> np.ndarray:
        """Evaluate a generator over an array, falling back to scalar calls if needed."""
        try:
            return cls._coerce_array(generator(x), x)
        except Exception:
            pass

        values = [generator(value) for value in np.asarray(x).tolist()]
        return cls._coerce_array(values, x)

    @staticmethod
    def auto_step(start: int, end: int, max_points: int) -> int:
        """Return a step size large enough to keep a plot within max_points."""
        if max_points < 1:
            raise ValueError("max_points must be at least 1.")

        span = abs(end - start) + 1
        return max(1, math.ceil(span / max_points))

    @classmethod
    def maybe_log_scale(cls, ax: Axes, scale: str) -> None:
        """Apply a linear, semilog-y, or log-log scale to an axes."""
        if scale == "linear":
            return
        if scale == "log":
            ax.set_yscale("log")
            return
        if scale == "loglog":
            ax.set_xscale("log")
            ax.set_yscale("log")
            return

        raise ValueError(
            f"Invalid scale {scale!r}. Expected one of {sorted(cls.VALID_SCALES)}."
        )


VALID_SCALES = PlotUtils.VALID_SCALES
safe_vectorize = PlotUtils.safe_vectorize
auto_step = PlotUtils.auto_step
maybe_log_scale = PlotUtils.maybe_log_scale

__all__ = [
    "Generator",
    "PlotUtils",
    "VALID_SCALES",
    "auto_step",
    "maybe_log_scale",
    "safe_vectorize",
]
