import { Card } from '../settings/ui';

export function AkgBulkNote() {
  return (
    <Card title="Pacing / ban-risk" sub="Bulk and broadcast reuse the existing batch API (delay + jitter + cancel).">
      <p className="text-[12.5px] text-muted">
        Steady, varied pacing is what keeps a number from being flagged. Cancel stops further sends; already-sent
        messages are not pulled back. Poll batch status while a job runs. History is the completed/cancelled/interrupted
        jobs already listed in this pane.
      </p>
    </Card>
  );
}
