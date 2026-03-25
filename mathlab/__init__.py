"""Easy-to-use math helpers for experiments and lab work."""

from .checks import CheckUtils, is_palindrome
from .primes import (
    PrimeUtils,
    generate_primes,
    is_prime,
    next_prime,
    nth_prime,
    previous_prime,
)

__all__ = [
    "CheckUtils",
    "PrimeUtils",
    "generate_primes",
    "is_palindrome",
    "is_prime",
    "next_prime",
    "nth_prime",
    "previous_prime",
]
__version__ = "0.1.0"
