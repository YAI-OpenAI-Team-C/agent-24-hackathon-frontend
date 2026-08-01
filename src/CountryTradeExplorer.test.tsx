import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CountryTradeDrawer } from "./CountryTradeExplorer";
import type { CountryDrilldown } from "./types";

const detail: CountryDrilldown = {
  key: "CN",
  label: "중국 (CN)",
  period: "2026-06",
  exports_usd: 150,
  imports_usd: 120,
  balance_usd: 30,
  export_mom_pct: 50,
  import_mom_pct: 33.3,
  export_yoy_pct: 87.5,
  import_yoy_pct: 71.4,
  monthly: [
    { period: "2026-05", exports_usd: 100, imports_usd: 90, balance_usd: 10 },
    { period: "2026-06", exports_usd: 150, imports_usd: 120, balance_usd: 30 },
  ],
  top_exports: [{ key: "8542", label: "반도체", value_usd: 120, share: 0.8 }],
  top_imports: [{ key: "8486", label: "반도체 장비", value_usd: 110, share: 0.9167 }],
};

describe("CountryTradeDrawer", () => {
  it("shows the selected LINER country detail and switches trade direction", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CountryTradeDrawer detail={detail} currency="USD" onClose={onClose}/>);

    expect(screen.getByRole("dialog", { name: "중국 (CN) 교역 상세" })).toBeVisible();
    expect(screen.getByText("반도체")).toBeVisible();
    expect(screen.getByRole("button", { name: "상세 닫기" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "수입" }));
    expect(screen.getByText("반도체 장비")).toBeVisible();
    expect(screen.queryByText("반도체")).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
