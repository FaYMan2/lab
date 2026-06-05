from __future__ import annotations

from collections.abc import Callable
from functools import lru_cache
from typing import SupportsInt, cast

import gmpy2
import pyprimesieve

_is_prime_impl = cast(Callable[[int], object], getattr(gmpy2, "is_prime"))
_next_prime_impl = cast(Callable[[int], SupportsInt], getattr(gmpy2, "next_prime"))
_previous_prime_impl = cast(Callable[[int], SupportsInt], getattr(gmpy2, "prev_prime"))


def generate_primes(start: int, end: int) -> list[int]:
    """Return primes in the inclusive range [start, end]."""
    if end < start:
        raise ValueError("end must be >= start")
    if end < 2:
        return []
    return list(pyprimesieve.primes(max(2, start), end + 1))


def is_prime(value: int) -> bool:
    """Return True if value is prime."""
    return value >= 2 and bool(_is_prime_impl(value))


def next_prime(value: int) -> int:
    """Return smallest prime strictly greater than value."""
    return int(_next_prime_impl(value))


def previous_prime(value: int) -> int:
    """Return largest prime smaller than value."""
    if value < 3:
        raise ValueError("value must be >= 3")
    return int(_previous_prime_impl(value))


def nth_prime(n: int) -> int:
    """Return the nth prime number."""
    if n < 1:
        raise ValueError("n must be >= 1")

    prime = 1
    for _ in range(n):
        prime = int(_next_prime_impl(prime))
    return prime


@lru_cache(maxsize=10_000)
def _factorize(value: int) -> tuple[tuple[int, int], ...]:
    """Return prime factorization as (prime, exponent)."""
    return tuple((int(prime), int(power)) for prime, power in pyprimesieve.factorize(value))


def get_prime_factors(value: int) -> list[int]:
    """Return the unique prime factors of value, in ascending order."""
    if value < 2:
        raise ValueError("value must be >= 2")
    return sorted({prime for prime, _ in _factorize(value)})


def get_factors(value: int) -> list[int]:
    """Return all factors of the number, in ascending order."""
    if value < 1:
        raise ValueError("value must be >= 1")

    factors = [1]
    for prime, power in _factorize(value):
        current: list[int] = []
        for exponent in range(1, power + 1):
            prime_power = prime**exponent
            current.extend(factor * prime_power for factor in factors)
        factors.extend(current)

    return sorted(factors)


__all__ = [
    "generate_primes",
    "is_prime",
    "next_prime",
    "previous_prime",
    "nth_prime",
    "get_factors",
    "get_prime_factors",
]
