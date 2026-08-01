import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InteractiveLinerChart } from "./InteractiveLinerChart";
import type { Chart } from "./types";

const chart: Chart = {
  id: "C_COUNTRIES",
  kind: "country",
  title: "주요 상대국별 6월 수출",
  ok: true,
  html: "<!doctype html><html><body>LINER chart</body></html>",
};

describe("InteractiveLinerChart", () => {
  it("accepts country selections only from its own LINER iframe", () => {
    const onCountrySelect = vi.fn();
    render(<InteractiveLinerChart chart={chart} onCountrySelect={onCountrySelect}/>);

    const iframe = screen.getByTitle(chart.title) as HTMLIFrameElement;
    fireEvent(window, new MessageEvent("message", {
      data: { type: "agent24:country-select", country: "CN" },
      source: iframe.contentWindow,
    }));

    expect(onCountrySelect).toHaveBeenCalledWith("CN", iframe);

    fireEvent(window, new MessageEvent("message", {
      data: { type: "agent24:country-select", country: "DE" },
      source: window,
    }));
    fireEvent(window, new MessageEvent("message", {
      data: { type: "unrelated", country: "DE" },
      source: iframe.contentWindow,
    }));

    expect(onCountrySelect).toHaveBeenCalledTimes(1);
  });
});
