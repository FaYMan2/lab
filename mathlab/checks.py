from __future__ import annotations

import math


def is_palindrome(value: int | str) -> bool:
    """Return True when the value reads the same backwards.

    Integers are compared by their decimal digit representation.
    """
    text = str(value)
    return text == text[::-1]


def is_square(value: int) -> bool:
    """Return True when the given integer is a perfect square."""
    if value < 0:
        return False
    root = math.isqrt(value)
    return root * root == value


def is_cube(value: int) -> bool:
    """Return True when the given integer is a perfect cube."""
    magnitude = abs(value)
    root = round(magnitude ** (1 / 3))
    # Guard against float-rounding near integer boundaries for large inputs.
    return any(candidate**3 == magnitude for candidate in (root - 1, root, root + 1))


__all__ = ["is_palindrome", "is_square", "is_cube"]
