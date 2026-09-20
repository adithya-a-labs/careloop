"""Idempotently seed the configured CareLoop demo Supabase project."""

from demo_data import (
    DemoDataError,
    build_demo_dataset,
    create_admin_client,
    print_summary,
    seed_demo,
    verify_demo_state,
)


def main() -> int:
    try:
        client = create_admin_client()
        dataset = build_demo_dataset()
        seed_demo(client, dataset)
        summary = verify_demo_state(client, dataset, exact=False)
        print_summary(summary, "seed")
        return 0
    except DemoDataError as exc:
        print(f"CareLoop demo seed failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
