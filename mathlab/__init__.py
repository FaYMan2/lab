"""Easy-to-use math helpers for experiments and lab work."""

from .checks import is_cube, is_palindrome, is_square
from .primes import (
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
    "get_factors",
    "get_prime_factors",
    "is_cube",
    "is_palindrome",
    "is_prime",
    "is_square",
    "next_prime",
    "nth_prime",
    "previous_prime",
]
__version__ = "0.1.0"
