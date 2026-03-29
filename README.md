# mathplot

This project now includes two lightweight Python packages:

- `mathplot` for plotting mathematical functions, sequences, and growth-rate experiments.
- `mathlab` for small, direct math utilities built on top of a few external packages.

## `mathplot` helpers

- `plot_fn(...)` plots a single generator over an inclusive range.
- `plot_many(...)` plots multiple labeled generators on the same axes and can add horizontal guide lines with `horizontal_lines={"label": value}`.
- `plot_diff(...)` plots the forward difference `f(n + 1) - f(n)`.

## `mathplot` example

```python
from mathplot import plot_fn


def quadratic(n):
    return n**2


plot_fn(quadratic, 0, 100, title="Quadratic growth")
```

See `examples/example_usage.py` for a fuller walkthrough.

## `mathlab` helpers

- `generate_primes(start, end)` returns the primes in an inclusive range.
- `nth_prime(n)` returns the nth prime number.
- `next_prime(value)` returns the next prime after a value.
- `previous_prime(value)` returns the previous prime before a value.
- `is_prime(value)` checks primality with `gmpy2`.
- `get_prime_factors(value)` returns the prime factors with multiplicity.
- `get_factors(value)` returns all factors of a positive integer.
- `is_palindrome(value)` accepts either an `int` or a `str`.
- `is_square(value)` checks whether an integer is a perfect square.

`generate_primes(...)` uses `pyprimesieve`, while the other prime helpers use `gmpy2`.
`PrimeUtils` and `CheckUtils` still exist as compatibility wrappers, but the direct functions are the intended interface.

## `mathlab` example

```python
from mathlab import generate_primes, is_palindrome, is_prime, next_prime, nth_prime

print(generate_primes(10, 30))
print(nth_prime(5))
print(next_prime(97))
print(is_prime(97))
print(is_palindrome("racecar"))
```

See `examples/example_mathlab.py` for a fuller walkthrough.
