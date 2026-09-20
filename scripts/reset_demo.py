"""Restore the configured CareLoop demo Supabase project to its opening state."""

from demo_data import (
    DemoDataError,
    build_demo_dataset,
    create_admin_client,
    print_summary,
    reset_demo,
    verify_demo_state,
)


def main() -> int:
    try:
        client = create_admin_client()
        dataset = build_demo_dataset()
        reset_demo(client, dataset)
        summary = verify_demo_state(client, dataset, exact=True)
        print_summary(summary, "reset")
        return 0
    except DemoDataError as exc:
        print(f"CareLoop demo reset failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
