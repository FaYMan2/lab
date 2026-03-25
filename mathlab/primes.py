from __future__ import annotations

from collections.abc import Callable
from typing import SupportsInt, cast

import gmpy2
import pyprimesieve

class PrimeUtils:

    _is_prime_impl = cast(Callable[[int], object], getattr(gmpy2, "is_prime"))
    _next_prime_impl = cast(Callable[[int], SupportsInt], getattr(gmpy2, "next_prime"))
    _previous_prime_impl = cast(
        Callable[[int], SupportsInt], getattr(gmpy2, "prev_prime")
    )

    @staticmethod
    def _validate_integer(value: int, name: str) -> int:
        """Validate integer inputs while rejecting booleans."""
        if isinstance(value, bool) or not isinstance(value, int):
            raise TypeError(f"{name} must be an integer.")
        return value

    @staticmethod
    def _call_bool(function: Callable[[int], object], value: int) -> bool:
        return bool(function(value))

    @staticmethod
    def _call_int(function: Callable[[int], SupportsInt], value: int) -> int:
        return int(function(value))

    @classmethod
    def generate_primes(cls, start: int, end: int) -> list[int]:
        """Return the primes in the inclusive range [start, end]."""
        start = cls._validate_integer(start, "start")
        end = cls._validate_integer(end, "end")
        if end < start:
            raise ValueError("end must be greater than or equal to start.")
        if end < 2:
            return []

        lower = max(2, start)
        return list(pyprimesieve.primes(lower, end + 1))

    @classmethod
    def is_prime(cls, value: int) -> bool:
        """Return True when the given integer is prime."""
        value = cls._validate_integer(value, "value")
        if value < 2:
            return False
        return cls._call_bool(cls._is_prime_impl, value)

    @classmethod
    def next_prime(cls, value: int) -> int:
        """Return the smallest prime strictly greater than value."""
        value = cls._validate_integer(value, "value")
        return cls._call_int(cls._next_prime_impl, value)

    @classmethod
    def previous_prime(cls, value: int) -> int:
        """Return the largest prime smaller than value."""
        value = cls._validate_integer(value, "value")
        if value < 3:
            raise ValueError("value must be greater than or equal to 3.")
        return cls._call_int(cls._previous_prime_impl, value)

    @classmethod
    def nth_prime(cls, n: int) -> int:
        """Return the nth prime number."""
        n = cls._validate_integer(n, "n")
        if n < 1:
            raise ValueError("n must be greater than or equal to 1.")

        prime = 1
        for _ in range(n):
            prime = cls._call_int(cls._next_prime_impl, prime)
        return prime


generate_primes = PrimeUtils.generate_primes
is_prime = PrimeUtils.is_prime
next_prime = PrimeUtils.next_prime
previous_prime = PrimeUtils.previous_prime
nth_prime = PrimeUtils.nth_prime

__all__ = [
    "PrimeUtils",
    "generate_primes",
    "is_prime",
    "next_prime",
    "previous_prime",
    "nth_prime",
]

