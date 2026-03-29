"""Easy-to-use math helpers for experiments and lab work."""

from .checks import CheckUtils, is_palindrome, is_square
from .primes import (
    PrimeUtils,
    generate_primes,
    get_factors,
    get_prime_factors,
    is_prime,
    next_prime,
    nth_prime,
    previous_prime,
)

__all__ = [
    "generate_primes",
    "is_prime",
    "next_prime",
    "nth_prime",
    "previous_prime",
    "get_factors",
    "get_prime_factors",
    "is_palindrome",
    "is_square",
    "PrimeUtils",
    "CheckUtils",
]
__version__ = "0.1.0"
