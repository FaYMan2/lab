from __future__ import annotations


class CheckUtils:
    @staticmethod
    def _validate_palindrome_input(value: int | str) -> int | str:
        """Validate palindrome inputs while rejecting booleans."""
        if isinstance(value, bool) or not isinstance(value, (int, str)):
            raise TypeError("value must be an int or str.")
        return value

    @classmethod
    def is_palindrome(cls, value: int | str) -> bool:
        """Return True when the given integer or string reads the same backwards."""
        value = cls._validate_palindrome_input(value)
        text = str(value)
        return text == text[::-1]


is_palindrome = CheckUtils.is_palindrome

__all__ = ["CheckUtils", "is_palindrome"]
