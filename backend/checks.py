from __future__ import annotations

from abc import ABC, abstractmethod

import pint
from schemas import CheckItem, CheckReport, FixSuggestion, PhysicalSpec
from kb_loader import KBLoader

ureg = pint.UnitRegistry()

# Critical keywords per domain (variable names or terms to look for in goal/assumptions)
# No dimensional equation parsing; simple substring match in lowercased text.
DOMAIN_CRITICAL: dict[str, set[str]] = {
    "mechanics": {"mass", "force", "acceleration", "velocity", "position", "angle", "friction", "gravity", "g", "m", "f", "a", "v", "x", "theta", "inclined", "block", "kinetic", "potential"},
    "thermodynamics": {"temperature", "heat", "entropy", "pressure", "volume", "energy", "t", "q", "s", "p", "v", "u", "work", "enthalpy", "ideal gas"},
    "electromagnetism": {"charge", "field", "magnetic", "current", "voltage", "e", "b", "q", "i", "v", "coulomb", "maxwell", "induction", "capacitor", "resistance"},
    "optics": {"light", "wave", "refraction", "reflection", "lens", "wavelength", "frequency", "index", "snell", "diffraction", "interference"},
    "quantum_mechanics": {"wave", "energy", "momentum", "probability", "operator", "hamiltonian", "eigenvalue", "quantum", "state", "particle"},
    "fluid_dynamics": {"velocity", "pressure", "density", "flow", "viscosity", "reynolds", "continuity", "bernoulli", "p", "v", "rho"},
    "waves": {"frequency", "wavelength", "amplitude", "velocity", "wave", "period", "oscillation", "standing", "harmonic"},
    "relativity": {"speed", "light", "mass", "energy", "lorentz", "time", "dilation", "contraction", "spacetime"},
    "other": set(),
}


class PhysicsCheck(ABC):
    id: str
    name: str

    @abstractmethod
    def run(self, spec: PhysicalSpec) -> CheckItem | list[CheckItem]:
        pass


# (name_or_symbol, (unit_value, label)); first match wins per variable
_UNIT_HEURISTICS: list[tuple[set[str], list[tuple[str, str]]]] = [
    ({"g"}, [("m/s^2", "m/s^2")]),
    ({"mu", "friction_coefficient", "friction"}, [("dimensionless", "dimensionless")]),
    ({"mass", "m"}, [("kg", "kg")]),
    ({"force", "f"}, [("N", "N")]),
    ({"accel", "a", "acceleration"}, [("m/s^2", "m/s^2")]),
    ({"velocity", "v"}, [("m/s", "m/s")]),
    ({"time", "t"}, [("s", "s")]),
    ({"angle", "theta", "θ"}, [("rad", "rad"), ("dimensionless", "dimensionless")]),
]


class UnitsCoverageCheck(PhysicsCheck):
    id = "units_coverage"
    name = "Units coverage"

    def run(self, spec: PhysicalSpec) -> CheckItem:
        vars_ = spec.variables
        if not vars_:
            return CheckItem(id=self.id, name=self.name, status="failed", message="No variables defined; cannot check units.")
        with_unit = sum(1 for v in vars_ if (v.unit or "").strip())
        related: list[str] = []
        fixes: list[FixSuggestion] = []
        for i, v in enumerate(vars_):
            if (v.unit or "").strip():
                continue
            related.append(f"variables.{i}.unit")
            n = (v.name or "").lower().strip()
            for names, options in _UNIT_HEURISTICS:
                if n in names:
                    for val, label in options:
                        fixes.append(FixSuggestion(op="set", path=f"variables.{i}.unit", value=val, label=label))
                    break
        if with_unit == len(vars_):
            return CheckItem(id=self.id, name=self.name, status="passed", message=f"All {len(vars_)} variable(s) have a unit.")
        if with_unit > 0:
            return CheckItem(
                id=self.id, name=self.name, status="warning",
                message=f"{with_unit}/{len(vars_)} variable(s) have a unit.",
                related_fields=related, fix_suggestions=fixes if fixes else None,
            )
        return CheckItem(
            id=self.id, name=self.name, status="failed",
            message="No variable has a unit specified.",
            related_fields=related, fix_suggestions=fixes if fixes else None,
        )


class DomainCriticalVariablesCheck(PhysicsCheck):
    id = "domain_critical_variables"
    name = "Domain-critical variables"

    def run(self, spec: PhysicalSpec) -> CheckItem:
        domain = spec.domain.value if hasattr(spec.domain, "value") else str(spec.domain)
        keywords = DOMAIN_CRITICAL.get(domain) or DOMAIN_CRITICAL.get("other") or set()
        if not keywords:
            return CheckItem(id=self.id, name=self.name, status="warning", message=f'Domain "{domain}" has no critical-variable template; skipping.')

        text = " ".join([
            spec.goal or "",
            " ".join(spec.assumptions or []),
            " ".join((v.name or "") for v in (spec.variables or [])),
        ]).lower()
        var_names = {(v.name or "").lower() for v in (spec.variables or [])}
        found = sum(1 for kw in keywords if kw in text or kw in var_names)
        if found >= 2:
            return CheckItem(id=self.id, name=self.name, status="passed", message=f"Found {found} domain-relevant term(s).")
        if found == 1:
            return CheckItem(id=self.id, name=self.name, status="warning", message="Only one domain-relevant term found; consider adding more.")
        return CheckItem(id=self.id, name=self.name, status="failed", message="No domain-relevant variables or terms found.")


class RegimeSanityCheck(PhysicsCheck):
    id = "regime_sanity"
    name = "Regime sanity"

    def run(self, spec: PhysicalSpec) -> CheckItem:
        goal_ok = bool((spec.goal or "").strip())
        n_assum = len(spec.assumptions or [])
        n_vars = len(spec.variables or [])

        if not goal_ok:
            return CheckItem(id=self.id, name=self.name, status="failed", message="Goal is empty.")
        if n_vars == 0:
            return CheckItem(id=self.id, name=self.name, status="failed", message="No variables defined.")
        if n_assum == 0:
            return CheckItem(id=self.id, name=self.name, status="warning", message="Goal and variables present but no assumptions.")
        return CheckItem(id=self.id, name=self.name, status="passed", message="Goal, assumptions, and variables present.")


# --- Domain pack: inclined plane (triggers on "plano inclinado"/"inclined plane" or variable theta)
def _inclined_plane_triggered(spec: PhysicalSpec) -> bool:
    text = " ".join([spec.goal or "", " ".join(spec.assumptions or [])]).lower()
    if "plano inclinado" in text or "inclined plane" in text:
        return True
    var_names = {(v.name or "").lower().strip() for v in (spec.variables or [])}
    return "theta" in var_names


class MechanicsInclinedPlaneCheck(PhysicsCheck):
    id = "mechanics_inclined_plane"
    name = "Inclined plane (domain pack)"

    def run(self, spec: PhysicalSpec) -> list[CheckItem]:
        if not _inclined_plane_triggered(spec):
            return []
        
        # If KB-backed suggested laws exist for inclined plane, skip heuristic checks
        # (KB requirements check will handle validation)
        kb_related_ids = {"inclined_plane_normal_force", "inclined_plane_friction_static", "inclined_plane_friction_kinetic"}
        has_kb_rules = any(
            (sl.kb_id or "").lower() in kb_related_ids
            for sl in (spec.suggested_laws or [])
        )
        if has_kb_rules:
            # KB-driven checks take precedence; only keep non-conflicting warnings
            items: list[CheckItem] = []
            var_names = {(v.name or "").lower().strip() for v in (spec.variables or []) if (v.name or "").strip()}
            text = " ".join([spec.goal or "", " ".join(spec.assumptions or [])]).lower()
            
            # Keep only general warnings that don't conflict with KB
            items.append(CheckItem(id="inclined_plane_radians", name="Inclined plane: angle units", status="warning", message="Clarify if theta is in degrees or radians.", metadata={"kb_driven": False}))
            items.append(CheckItem(id="inclined_plane_mu_type", name="Inclined plane: friction coefficient", status="warning", message="Clarify if μ is static or kinetic; a = g*(sin(θ)-μ*cos(θ)) assumes kinetic.", metadata={"kb_driven": False}))
            return items
        
        # Original heuristic checks (when no KB rules apply)
        items: list[CheckItem] = []
        var_names = {(v.name or "").lower().strip() for v in (spec.variables or []) if (v.name or "").strip()}
        text = " ".join([spec.goal or "", " ".join(spec.assumptions or [])]).lower()
        friction_mentioned = "friction" in text or "fricción" in text or "friccion" in text

        # Warnings: missing m, theta, g; if friction mentioned -> mu
        if "m" not in var_names:
            items.append(CheckItem(id="inclined_plane_missing_m", name="Inclined plane: missing m", status="warning", message="Mass m is typically needed.", metadata={"kb_driven": False}))
        if "theta" not in var_names:
            items.append(CheckItem(id="inclined_plane_missing_theta", name="Inclined plane: missing theta", status="warning", message="Angle θ is typically needed.", metadata={"kb_driven": False}))
        if "g" not in var_names:
            items.append(CheckItem(id="inclined_plane_missing_g", name="Inclined plane: missing g", status="warning", message="Gravity g is typically needed.", metadata={"kb_driven": False}))
        if friction_mentioned and "mu" not in var_names and "μ" not in var_names:
            items.append(CheckItem(id="inclined_plane_missing_mu", name="Inclined plane: missing μ", status="warning", message="Friction is mentioned; coefficient μ is typically needed.", metadata={"kb_driven": False}))

        # Suggested laws (CheckItems with metadata.suggested_law) - only if no KB rules
        items.append(CheckItem(id="inclined_plane_law_N", name="Suggested: Normal force", status="passed", message="N = m*g*cos(theta)", metadata={"suggested_law": "N = m*g*cos(theta)", "kb_driven": False}))
        items.append(CheckItem(id="inclined_plane_law_f", name="Suggested: Friction force", status="passed", message="f = mu*N", metadata={"suggested_law": "f = mu*N", "kb_driven": False}))
        items.append(CheckItem(id="inclined_plane_law_a", name="Suggested: Acceleration (kinetic)", status="passed", message="a = g*(sin(theta) - mu*cos(theta)) for kinetic friction", metadata={"suggested_law": "a = g*(sin(theta) - mu*cos(theta)) for kinetic friction", "kb_driven": False}))

        # Warnings: degrees vs radians; mu_static vs mu_kinetic
        items.append(CheckItem(id="inclined_plane_radians", name="Inclined plane: angle units", status="warning", message="Clarify if theta is in degrees or radians.", metadata={"kb_driven": False}))
        items.append(CheckItem(id="inclined_plane_mu_type", name="Inclined plane: friction coefficient", status="warning", message="Clarify if μ is static or kinetic; a = g*(sin(θ)-μ*cos(θ)) assumes kinetic.", metadata={"kb_driven": False}))

        return items


# --- DimensionalConsistencyCheckLite: one '=', + - * /, no functions
def _parse_unit(u: str):
    if not (u or "").strip():
        return None
    s = (u or "").strip()
    if s.lower() == "dimensionless":
        return 1 * ureg.dimensionless
    try:
        return 1 * ureg(s)
    except Exception:
        try:
            return 1 * ureg(s.replace("^", "**"))
        except Exception:
            return None


def _tokenize_equation(side: str, var_names: set[str]) -> list | None:
    """Tokens: '+','-','*','/' or ('n', float) or ('v', str). Returns None if unparseable."""
    s = (side or "").strip()
    tokens: list = []
    i = 0
    n = len(s)
    while i < n:
        while i < n and s[i].isspace():
            i += 1
        if i >= n:
            break
        if s[i] in "()":
            return None
        if s[i] in "+-*/":
            tokens.append(s[i])
            i += 1
            continue
        if s[i].isdigit() or (s[i] == "." and i + 1 < n and s[i + 1].isdigit()):
            start = i
            if s[i] == ".":
                i += 1
            while i < n and (s[i].isdigit() or s[i] == "."):
                i += 1
            try:
                tokens.append(("n", float(s[start:i])))
            except ValueError:
                return None
            continue
        if s[i].isalpha() or s[i] == "_":
            start = i
            while i < n and (s[i].isalnum() or s[i] == "_"):
                i += 1
            tok = s[start:i]
            low = tok.lower()
            if low in var_names:
                tokens.append(("v", tok))
            else:
                return None
            continue
        return None
    return tokens


def _shunting_yard(tokens: list) -> list:
    prec = {"+": 0, "-": 0, "*": 1, "/": 1}
    out, op_stack = [], []
    for t in tokens:
        if isinstance(t, str) and t in "+-*/":
            while op_stack and isinstance(op_stack[-1], str) and op_stack[-1] in "+-*/" and prec[op_stack[-1]] >= prec[t]:
                out.append(op_stack.pop())
            op_stack.append(t)
        else:
            out.append(t)
    while op_stack:
        out.append(op_stack.pop())
    return out


def _eval_rpn(rpn: list, unit_map: dict[str, "pint.Quantity"]) -> "pint.Quantity | None":
    """unit_map: lowercase var name -> 1*pint.Unit. Returns None on error."""
    stack: list = []
    for t in rpn:
        if isinstance(t, tuple) and t[0] == "n":
            stack.append(1 * ureg.dimensionless)
        elif isinstance(t, tuple) and t[0] == "v":
            name = t[1]
            u = unit_map.get(name.lower())
            if u is None:
                return None
            stack.append(u)
        elif t in "+-*/":
            if len(stack) < 2:
                return None
            b, a = stack.pop(), stack.pop()
            try:
                if t == "+":
                    stack.append(a + b)
                elif t == "-":
                    stack.append(a - b)
                elif t == "*":
                    stack.append(a * b)
                elif t == "/":
                    stack.append(a / b)
            except Exception:
                return None
        else:
            return None
    return stack[0] if len(stack) == 1 else None


class DimensionalConsistencyCheckLite(PhysicsCheck):
    id = "dimensional_consistency_lite"
    name = "Dimensional consistency (lite)"

    def run(self, spec: PhysicalSpec) -> list[CheckItem]:
        items: list[CheckItem] = []
        var_names = {(v.name or "").lower().strip() for v in (spec.variables or []) if (v.name or "").strip()}
        unit_map: dict[str, pint.Quantity] = {}
        for v in spec.variables or []:
            name = (v.name or "").strip()
            if not name:
                continue
            q = _parse_unit(v.unit)
            if q is not None:
                unit_map[name.lower()] = q

        for idx, law in enumerate(spec.candidate_laws or []):
            form = (law.form or "").strip()
            if not form:
                continue
            parts = form.split("=", 1)
            if len(parts) != 2:
                items.append(CheckItem(
                    id=f"dimensional_{idx}",
                    name="Dimensional consistency",
                    status="warning",
                    message="Equation not checkable (expected exactly one '=').",
                    metadata={"dimensional_check": True, "law_form": form, "law_index": idx},
                ))
                continue
            lhs_s, rhs_s = parts[0].strip(), parts[1].strip()
            lhs_t = _tokenize_equation(lhs_s, var_names)
            rhs_t = _tokenize_equation(rhs_s, var_names)
            if lhs_t is None or rhs_t is None:
                items.append(CheckItem(
                    id=f"dimensional_{idx}",
                    name="Dimensional consistency",
                    status="warning",
                    message="Equation not checkable (unsupported operators or syntax).",
                    metadata={"dimensional_check": True, "law_form": form, "law_index": idx},
                ))
                continue
            missing = [t[1] for t in lhs_t + rhs_t if isinstance(t, tuple) and t[0] == "v" and t[1].lower() not in unit_map]
            if missing:
                items.append(CheckItem(
                    id=f"dimensional_{idx}",
                    name="Dimensional consistency",
                    status="warning",
                    message=f"Cannot check due to missing units for: {', '.join(missing)}",
                    metadata={"dimensional_check": True, "law_form": form, "law_index": idx, "missing_vars": missing},
                ))
                continue
            rpn_l = _shunting_yard(lhs_t)
            rpn_r = _shunting_yard(rhs_t)
            q_l = _eval_rpn(rpn_l, unit_map)
            q_r = _eval_rpn(rpn_r, unit_map)
            if q_l is None or q_r is None:
                items.append(CheckItem(
                    id=f"dimensional_{idx}",
                    name="Dimensional consistency",
                    status="warning",
                    message="Equation not checkable.",
                    metadata={"dimensional_check": True, "law_form": form, "law_index": idx},
                ))
                continue
            try:
                same = q_l.dimensionality == q_r.dimensionality
            except Exception:
                same = False
            lhs_str = str(q_l.units) if hasattr(q_l, "units") else str(q_l)
            rhs_str = str(q_r.units) if hasattr(q_r, "units") else str(q_r)
            if not same:
                items.append(CheckItem(
                    id=f"dimensional_{idx}",
                    name="Dimensional consistency",
                    status="failed",
                    message="LHS and RHS dimensions differ.",
                    metadata={"dimensional_check": True, "law_form": form, "law_index": idx, "lhs_unit": lhs_str, "rhs_unit": rhs_str},
                ))
            else:
                items.append(CheckItem(
                    id=f"dimensional_{idx}",
                    name="Dimensional consistency",
                    status="passed",
                    message="LHS and RHS match.",
                    metadata={"dimensional_check": True, "law_form": form, "law_index": idx, "lhs_unit": lhs_str, "rhs_unit": rhs_str},
                ))
        return items


class KBRequirementsCheck(PhysicsCheck):
    """Validates that PhysicalSpec meets requirements for KB-backed suggested laws."""
    id = "kb_requirements"
    name = "KB requirements validation"

    def __init__(self):
        self._kb_loader = KBLoader()

    def run(self, spec: PhysicalSpec) -> list[CheckItem]:
        items: list[CheckItem] = []
        if not spec.suggested_laws:
            return items

        var_names = {(v.name or "").lower().strip() for v in (spec.variables or []) if (v.name or "").strip()}
        assumptions_text = " ".join((spec.assumptions or [])).lower()

        for suggested_law in spec.suggested_laws:
            kb_id = suggested_law.kb_id
            kb_entry = self._kb_loader.get_by_id(kb_id)
            if not kb_entry or not kb_entry.requirements:
                continue

            req = kb_entry.requirements
            missing_vars: list[str] = []
            missing_assumptions: list[str] = []

            # Check required variables (case-insensitive)
            for req_var in req.variables:
                req_var_lower = req_var.lower().strip()
                if not any(vn == req_var_lower for vn in var_names):
                    missing_vars.append(req_var)

            # Check required assumptions (keyword matching, case-insensitive)
            for req_assum in req.assumptions:
                req_assum_lower = req_assum.lower().strip()
                if req_assum_lower not in assumptions_text:
                    missing_assumptions.append(req_assum)

            # Generate CheckItem if requirements are not met
            if missing_vars or missing_assumptions:
                messages: list[str] = []
                if missing_vars:
                    messages.append(f"Missing variables: {', '.join(missing_vars)}")
                if missing_assumptions:
                    messages.append(f"Missing assumptions/keywords: {', '.join(missing_assumptions)}")

                # Determine status: failed if critical variables missing, warning otherwise
                status = "failed" if missing_vars else "warning"
                items.append(CheckItem(
                    id=f"kb_req_{kb_id}",
                    name=f"KB requirement: {kb_entry.name}",
                    status=status,
                    message="; ".join(messages),
                    metadata={"source_kb_id": kb_id, "kb_driven": True},
                ))
            else:
                # All requirements met
                items.append(CheckItem(
                    id=f"kb_req_{kb_id}_ok",
                    name=f"KB requirement: {kb_entry.name}",
                    status="passed",
                    message=f"All requirements met for {kb_entry.name}",
                    metadata={"source_kb_id": kb_id, "kb_driven": True},
                ))

        return items


class CheckRunner:
    def __init__(self, checks: list[PhysicsCheck] | None = None):
        self._checks = checks or [
            UnitsCoverageCheck(),
            DomainCriticalVariablesCheck(),
            RegimeSanityCheck(),
            KBRequirementsCheck(),  # Add KB requirements check
            MechanicsInclinedPlaneCheck(),
            DimensionalConsistencyCheckLite(),
        ]

    def run_all(self, spec: PhysicalSpec) -> CheckReport:
        items: list[CheckItem] = []
        for c in self._checks:
            r = c.run(spec)
            if isinstance(r, list):
                items.extend(r)
            else:
                items.append(r)
        return CheckReport(items=items)


def get_science_facts_count() -> int:
    """Load Science Facts KB (knowledge_base_science/facts/*.yaml) and return count. For unit-like check."""
    try:
        from debate_kb_loader import ScienceFactsLoader
        loader = ScienceFactsLoader()
        return len(loader.get_all())
    except Exception:
        return 0


def validate_science_facts_yaml() -> None:
    """Parse every YAML in knowledge_base_science/facts/*.yaml with yaml.safe_load. Fail fast with filename + line/column."""
    import sys
    import yaml
    from pathlib import Path

    facts_dir = Path(__file__).resolve().parent / "knowledge_base_science" / "facts"
    if not facts_dir.exists():
        return
    for yaml_path in sorted(facts_dir.glob("*.yaml")):
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                yaml.safe_load(f)
        except yaml.YAMLError as e:
            filename = str(yaml_path)
            if hasattr(e, "problem_mark") and e.problem_mark:
                pm = e.problem_mark
                line, col = pm.line + 1, pm.column + 1
                print(f"YAML parse error: {filename} line {line} column {col}: {e}", file=sys.stderr)
            else:
                print(f"YAML parse error: {filename}: {e}", file=sys.stderr)
            sys.exit(1)
    print(f"Science facts YAML validation OK ({len(list(facts_dir.glob('*.yaml')))} files).")


def check_science_facts_retrieval() -> bool:
    """
    Regression: for query 'does god exist according to science?' ranking returns 1-3 items
    if relevant YAML files exist (e.g. falsifiability, limits of science). Never returns more than 3.
    Uses rank_facts_for_debate (deterministic ranking with field preference).
    """
    try:
        from debate_kb_loader import ScienceFactsLoader
        loader = ScienceFactsLoader()
        query = "does god exist according to science?"
        debate_title = "Does science prove the existence of God?"
        result = loader.rank_facts_for_debate(query=query, debate_title=debate_title, lang="en", max_k=3)
        items = [item for item, _ in result]
        assert len(items) <= 3, f"Expected at most 3 facts, got {len(items)}"
        if loader.get_all() or loader._snippets:
            assert len(items) >= 1, (
                f"Expected at least 1 fact for query '{query}' when KB has entries; got {len(items)}"
            )
        return True
    except Exception as e:
        print(f"Science facts retrieval check failed: {e}", file=__import__("sys").stderr)
        return False


if __name__ == "__main__":
    import sys
    validate_science_facts_yaml()
    print("Science facts loaded:", get_science_facts_count())
    if not check_science_facts_retrieval():
        sys.exit(1)
    print("Science facts retrieval check OK (1-3 items for 'does god exist according to science?').")
