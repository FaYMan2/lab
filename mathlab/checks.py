from __future__ import annotations

import math


def is_palindrome(value: int | str) -> bool:
    """Return True when the given integer or string reads the same backwards."""
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise TypeError("value must be an int or str.")

    text = str(value)
    return text == text[::-1]


def is_square(value: int) -> bool:
    """Return True when the given integer is a perfect square."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError("value must be an integer.")
    if value < 0:
        return False

    root = math.isqrt(value)
    return root * root == value


class CheckUtils:
    """Compatibility wrapper around the module-level check helpers."""

    is_palindrome = staticmethod(is_palindrome)
    is_square = staticmethod(is_square)


__all__ = ["is_palindrome", "is_square", "CheckUtils"]
