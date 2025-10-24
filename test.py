import argparse
import os
import numpy as np

#!/usr/bin/env python3
"""
Generate and plot a random 2D scatter of points.

Usage:
    python test.py [--n N] [--seed S] [--out FILE] [--noshow]

By default this saves "random_scatter.png" and shows the plot if a display is available.
"""
import matplotlib.pyplot as plt


def random_scatter(n=200, seed=None):
    rng = np.random.default_rng(seed) 
    pts = rng.normal(size=(n, 2))  # 2D Gaussian cloud
    colors = rng.random(n)
    sizes = 20 + 180 * rng.random(n)
    return pts[:, 0], pts[:, 1], colors, sizes


def plot_and_save(x, y, colors, sizes, out_path="random_scatter.png", show=True):
    plt.style.use("seaborn-v0_8")
    fig, ax = plt.subplots(figsize=(8, 6))
    sc = ax.scatter(x, y, c=colors, s=sizes, cmap="viridis", alpha=0.85, edgecolor="k", linewidth=0.3)
    ax.set_title("Random 2D Scatter")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.grid(True, linestyle="--", alpha=0.5)
    ax.set_aspect("equal", adjustable="box")
    plt.colorbar(sc, ax=ax, label="color")
    fig.tight_layout()

    # Save to file
    fig.savefig(out_path, dpi=150)
    print(f"Saved plot to: {os.path.abspath(out_path)}")

    # Attempt to show if requested
    if show:
        try:
            plt.show()
        except Exception:
            # In headless environments, plt.show() may fail; ignore.
            pass
    plt.close(fig)


def main():
    p = argparse.ArgumentParser(description="Plot a random 2D scatter of points.")
    p.add_argument("--n", type=int, default=300, help="Number of points")
    p.add_argument("--seed", type=int, default=None, help="Random seed")
    p.add_argument("--out", default="random_scatter.png", help="Output image file")
    p.add_argument("--noshow", action="store_true", help="Do not call plt.show()")
    args = p.parse_args()

    x, y, colors, sizes = random_scatter(n=args.n, seed=args.seed)
    plot_and_save(x, y, colors, sizes, out_path=args.out, show=not args.noshow)


if __name__ == "__main__":
    main()