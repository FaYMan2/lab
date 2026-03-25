# mathplot

`mathplot` is a lightweight Python package for plotting mathematical functions,
sequences, and simple growth-rate experiments with `numpy` and `matplotlib`.

## Included helpers

- `plot_fn(...)` plots a single generator over an inclusive range.
- `plot_many(...)` plots multiple labeled generators on the same axes.
- `plot_diff(...)` plots the forward difference `f(n + 1) - f(n)`.

## Example

```python
from mathplot import plot_fn


def quadratic(n):
    return n**2


plot_fn(quadratic, 0, 100, title="Quadratic growth")
```

See `examples/example_usage.py` for a fuller walkthrough.
