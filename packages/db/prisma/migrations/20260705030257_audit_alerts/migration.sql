-- CreateEnum
CREATE TYPE "AuditAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "audit_alerts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "etablissement_id" UUID,
    "severity" "AuditAlertSeverity" NOT NULL DEFAULT 'WARNING',
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_alerts_tenant_id_resolved_at_idx" ON "audit_alerts"("tenant_id", "resolved_at");

-- CreateIndex
CREATE INDEX "audit_alerts_tenant_id_severity_idx" ON "audit_alerts"("tenant_id", "severity");

-- AddForeignKey
ALTER TABLE "audit_alerts" ADD CONSTRAINT "audit_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
