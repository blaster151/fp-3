import {
  clearSessionTypeGlueingBlockedManifestPlanQueue,
  enqueueSessionTypeGlueingBlockedManifestPlanQueue,
  peekSessionTypeGlueingBlockedManifestPlanQueue,
  SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
} from "./session-type-glueing-blocked-manifest-plan-queue";
import {
  clearSessionTypeGlueingManifestQueue,
  enqueueSessionTypeGlueingManifestQueue,
  peekSessionTypeGlueingManifestQueue,
  SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
} from "./session-type-glueing-manifest-queue";
import {
  collectSessionTypeManifestQueueTestCoverageGateIssues,
  markSessionTypeGlueingManifestQueueTestedFromQueues,
  readSessionTypeGlueingManifestQueueTestStatus,
  type SessionTypeGlueingManifestQueueCoverageGateStatus,
  type SessionTypeGlueingManifestQueueTestStatus,
  type SessionTypeGlueingManifestQueueTestStatusRecord,
} from "./session-type-glueing-manifest-queue-test-status";

const cloneCoverageGate = (
  coverageGate?: SessionTypeGlueingManifestQueueCoverageGateStatus,
): SessionTypeGlueingManifestQueueCoverageGateStatus | undefined =>
  coverageGate
    ? {
        checkedAt: coverageGate.checkedAt,
        issues: Array.from(coverageGate.issues),
        warnings: Array.from(coverageGate.warnings),
        ...(coverageGate.blockedManifestPlanQueueIssues &&
        coverageGate.blockedManifestPlanQueueIssues.length > 0
          ? {
              blockedManifestPlanQueueIssues: Array.from(
                coverageGate.blockedManifestPlanQueueIssues,
              ),
            }
          : {}),
        ...(coverageGate.queueSnapshotPaths
          ? { queueSnapshotPaths: coverageGate.queueSnapshotPaths }
          : {}),
        ...(coverageGate.queueSnapshotPathsInferred
          ? { queueSnapshotPathsInferred: true }
          : {}),
      }
    : undefined;

export interface SessionTypeGlueingManifestQueueSentinelSnapshot {
  readonly originalManifestQueue: ReadonlyArray<string>;
  readonly originalBlockedManifestPlanQueue: ReadonlyArray<string>;
  readonly originalManifestQueueTestStatus: SessionTypeGlueingManifestQueueTestStatus;
  readonly refreshSentinelFromOriginalQueues: () => SessionTypeGlueingManifestQueueTestStatusRecord;
  readonly restoreManifestQueuesAndSentinel: () => SessionTypeGlueingManifestQueueTestStatusRecord | undefined;
}

export const snapshotSessionTypeGlueingManifestQueueSentinel = (options?: {
  readonly coverageGateMetadataEntries?: ReadonlyArray<string>;
}): SessionTypeGlueingManifestQueueSentinelSnapshot => {
  const originalManifestQueue = peekSessionTypeGlueingManifestQueue();
  const originalBlockedManifestPlanQueue = peekSessionTypeGlueingBlockedManifestPlanQueue();
  const originalManifestQueueTestStatus = readSessionTypeGlueingManifestQueueTestStatus();

  const logCoverageGateStatus = (
    label: string,
    status:
      | SessionTypeGlueingManifestQueueTestStatus
      | SessionTypeGlueingManifestQueueTestStatusRecord,
  ): void => {
    const normalizedStatus: SessionTypeGlueingManifestQueueTestStatus =
      "tested" in status
        ? status
        : {
            tested: true,
            testedAt: status.testedAt,
            revision: status.revision,
            coverageGate: status.coverageGate,
          };
    const consolidated = collectSessionTypeManifestQueueTestCoverageGateIssues(normalizedStatus, {
      ...(options?.coverageGateMetadataEntries
        ? { coverageGateMetadataEntries: options.coverageGateMetadataEntries }
        : {}),
    });
    const coverageGate = normalizedStatus.coverageGate;
    const checkedAt = coverageGate?.checkedAt ?? normalizedStatus.testedAt ?? "unspecified";
    console.log(
      `[manifest-queue coverage gate] ${label}: checkedAt=${checkedAt} issues=${
        consolidated.issues.length > 0 ? consolidated.issues.join(", ") : "none"
      } warnings=${consolidated.warnings.length > 0 ? consolidated.warnings.join(" | ") : "none"}`,
    );
  };

  logCoverageGateStatus("existing sentinel", originalManifestQueueTestStatus);

  const refreshSentinelFromOriginalQueues = () => {
    const coverageGate = cloneCoverageGate(originalManifestQueueTestStatus.coverageGate);
    const record = markSessionTypeGlueingManifestQueueTestedFromQueues(
      coverageGate
        ? { coverageGate, blockedManifestPlanQueuePaths: originalBlockedManifestPlanQueue }
        : { blockedManifestPlanQueuePaths: originalBlockedManifestPlanQueue },
    );
    logCoverageGateStatus("refreshed sentinel", record);
    return record;
  };

  let restoredOriginalQueues = false;
  const restoreManifestQueuesAndSentinel = () => {
    if (restoredOriginalQueues) {
      return;
    }
    restoredOriginalQueues = true;
    clearSessionTypeGlueingManifestQueue();
    clearSessionTypeGlueingBlockedManifestPlanQueue();
    if (originalManifestQueue.length > 0) {
      enqueueSessionTypeGlueingManifestQueue(originalManifestQueue);
    }
    if (originalBlockedManifestPlanQueue.length > 0) {
      enqueueSessionTypeGlueingBlockedManifestPlanQueue(originalBlockedManifestPlanQueue);
    }
    return refreshSentinelFromOriginalQueues();
  };

  return {
    originalManifestQueue,
    originalBlockedManifestPlanQueue,
    originalManifestQueueTestStatus,
    refreshSentinelFromOriginalQueues,
    restoreManifestQueuesAndSentinel,
  } satisfies SessionTypeGlueingManifestQueueSentinelSnapshot;
};

export const installSessionTypeGlueingManifestQueueSentinelSnapshotHooks = (): SessionTypeGlueingManifestQueueSentinelSnapshot => {
  const snapshot = snapshotSessionTypeGlueingManifestQueueSentinel();
  snapshot.refreshSentinelFromOriginalQueues();
  console.log(
    `Session-type manifest-queue snapshot installed: manifest=${SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH} blockedPlan=${SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH}`,
  );
  process.on("exit", snapshot.restoreManifestQueuesAndSentinel);
  return snapshot;
};
