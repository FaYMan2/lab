from mathplot import plot_diff, plot_fn, plot_many


def linear(n: int | float) -> int | float:
    """A simple linear function."""
    return 2 * n + 3


def quadratic(n: int | float) -> int | float:
    """A simple quadratic function."""
    return n**2


def pentagonal(n: int | float) -> float:
    """Return the nth pentagonal number."""
    return n * (3 * n - 1) / 2


if __name__ == "__main__":
    plot_fn(
        linear,
        0,
        50,
        title="Linear function",
        ylabel="2n + 3",
    )

    plot_many(
        {"linear": linear, "quadratic": quadratic},
        0,
        50,
        title="Linear vs quadratic",
        ylabel="value",
    )

    plot_diff(
        pentagonal,
        1,
        100,
        title="Difference of pentagonal numbers",
        ylabel="P(n + 1) - P(n)",
    )
