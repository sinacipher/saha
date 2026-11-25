import { describe, expect, it } from "vitest"
import { getRoleDashboardPath } from "./role-routing"

describe("getRoleDashboardPath", () => {
  it("routes each application role to its dashboard", () => {
    expect(getRoleDashboardPath("ADMIN")).toBe("/admin")
    expect(getRoleDashboardPath("COUNSELOR")).toBe("/counselor")
    expect(getRoleDashboardPath("STUDENT")).toBe("/student")
    expect(getRoleDashboardPath("PARENT")).toBe("/parent")
  })

  it("rejects unknown or missing roles", () => {
    expect(getRoleDashboardPath(undefined)).toBeNull()
    expect(getRoleDashboardPath("UNKNOWN")).toBeNull()
  })
})
