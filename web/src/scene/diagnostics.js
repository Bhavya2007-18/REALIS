// Structured diagnostics (master spec §16).
//
// Before this module, REALIS reported failures in three incompatible ways:
// `throw` on the first problem (models/schema.js), a bare `{valid, reason}`
// string (draftEntityAdapter.js), or a silent console.warn + drop. None of them
// could report more than one problem, and none identified WHICH entity failed.
//
// This module defines the one diagnostic shape every subsystem reports through.
// Pure: no THREE.js, React, or store imports.

/** Diagnostic severity, ordered least → most severe. */
export const Severity = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  FATAL: 'FATAL'
});

/** Severity ordering. Exported so UI can rank without re-declaring the order. */
export const SEVERITY_RANK = Object.freeze({ INFO: 0, WARNING: 1, ERROR: 2, FATAL: 3 });

/** Subsystem a diagnostic originated from. */
export const Category = Object.freeze({
  SCENE: 'Scene',
  PHYSICS: 'Physics',
  SOLVER: 'Solver',
  CONSTRAINT: 'Constraint',
  SIMULATION: 'Simulation',
  TELEMETRY: 'Telemetry',
  ANALYSIS: 'Analysis',
  TEST: 'Test',
  EXPORT: 'Export',
  AI: 'AI',
  SYSTEM: 'System'
});

let seq = 0;

/**
 * Build a structured diagnostic.
 *
 * `code` is a stable machine-readable identifier (e.g. 'SCENE_DUPLICATE_ID')
 * that tests and the AI layer can match on without parsing prose; `message` is
 * the human-readable explanation.
 *
 * @param {object} spec
 * @param {string} spec.severity   One of Severity.*
 * @param {string} spec.category   One of Category.*
 * @param {string} spec.code       Stable machine-readable code
 * @param {string} spec.message    Human-readable explanation
 * @param {string} [spec.objectId] Entity this concerns, when applicable
 * @param {string} [spec.constraintId]
 * @param {string} [spec.path]     Dotted path to the offending field
 * @param {object} [spec.metadata] Extra structured context (expected/actual/…)
 * @returns {object} diagnostic
 */
export function diagnostic({
  severity = Severity.ERROR,
  category = Category.SCENE,
  code,
  message,
  objectId,
  constraintId,
  path,
  metadata
} = {}) {
  seq += 1;
  const d = {
    id: `diag_${seq}`,
    severity,
    category,
    code: code || 'UNKNOWN',
    message: message || '',
    source: category
  };
  // Only attach optional identity fields when present, so diagnostics compare
  // cleanly in tests instead of carrying a spray of undefined keys.
  if (objectId !== undefined) d.objectId = objectId;
  if (constraintId !== undefined) d.constraintId = constraintId;
  if (path !== undefined) d.path = path;
  if (metadata !== undefined) d.metadata = metadata;
  return d;
}

/** True when `list` contains at least one ERROR or FATAL diagnostic. */
export function hasBlockingError(list) {
  return (list || []).some(
    (d) => d.severity === Severity.ERROR || d.severity === Severity.FATAL
  );
}

/** Filter to a single severity. */
export function bySeverity(list, severity) {
  return (list || []).filter((d) => d.severity === severity);
}

/** Sort a copy of `list` most-severe first; original order breaks ties. */
export function sortBySeverity(list) {
  return [...(list || [])].sort(
    (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
  );
}

/** Compact one-line rendering, useful in logs and test failure output. */
export function formatDiagnostic(d) {
  const target = d.objectId || d.constraintId || d.path;
  return `[${d.severity}] ${d.category}/${d.code}${target ? ` (${target})` : ''}: ${d.message}`;
}

/** Reset the diagnostic id counter. Test-support only. */
export function __resetDiagnosticIds() {
  seq = 0;
}
