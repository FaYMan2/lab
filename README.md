# mathplot

This project now includes two lightweight Python packages:

- `mathplot` for plotting mathematical functions, sequences, and growth-rate experiments.
- `mathlab` for small, easy-to-use math utilities built from external packages and internal helpers.

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

- `PrimeUtils` groups the prime-related helpers in one place.
- `generate_primes(start, end)` returns the primes in an inclusive range.
- `nth_prime(n)` returns the nth prime number.
- `next_prime(value)` returns the next prime after a value.
- `previous_prime(value)` returns the previous prime before a value.
- `intersection(list1, list2, ..., listn)` returns common values in first-list order.
- `union(list1, list2, ..., listn)` returns unique values in first-seen order.
- `is_prime(value)` checks primality with `gmpy2`.
- `is_palindrome(value)` accepts either an `int` or a `str`.

`generate_primes(...)` uses `pyprimesieve`, while the other prime helpers use `gmpy2`.

## `mathlab` example

```python
from mathlab import PrimeUtils, intersection, is_palindrome, union

print(PrimeUtils.generate_primes(10, 30))
print(PrimeUtils.nth_prime(5))
print(PrimeUtils.next_prime(97))
print(intersection([1, 2, 3], [2, 3, 4], [0, 3, 2]))
print(union([1, 2], [2, 3], [3, 4]))
print(PrimeUtils.is_prime(97))
print(is_palindrome("racecar"))
```

See `examples/example_mathlab.py` for a fuller walkthrough.
