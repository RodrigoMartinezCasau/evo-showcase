import yaml
from pathlib import Path
from typing import List

from kb_schemas import KBEntry, KBDomain

# Path to knowledge_base directory
KB_DIR = Path(__file__).parent / "knowledge_base"


class KBLoader:
    """Loads and validates Knowledge Base entries from YAML files."""

    def __init__(self):
        self._entries: dict[str, KBEntry] = {}
        self._load_all()

    def _load_all(self):
        """Load all YAML files from knowledge_base directory structure."""
        if not KB_DIR.exists():
            return
        for domain_dir in KB_DIR.iterdir():
            if not domain_dir.is_dir():
                continue
            domain_name = domain_dir.name
            try:
                domain_enum = KBDomain(domain_name)
            except ValueError:
                continue
            for yaml_file in domain_dir.glob("*.yaml"):
                self._load_file(yaml_file, domain_enum)

    def _load_file(self, yaml_path: Path, expected_domain: KBDomain):
        """Load entries from a single YAML file."""
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, list):
                data = [data]
            for entry_dict in data:
                try:
                    entry = KBEntry(**entry_dict)
                    if entry.domain != expected_domain:
                        raise ValueError(f"Entry domain '{entry.domain}' does not match directory '{expected_domain}'")
                    if entry.id in self._entries:
                        raise ValueError(f"Duplicate KB entry id: {entry.id}")
                    self._entries[entry.id] = entry
                except Exception as e:
                    raise ValueError(f"Invalid entry in {yaml_path}: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to load {yaml_path}: {e}") from e

    def get_entries(self, domain: KBDomain | None = None, keywords: List[str] | None = None) -> List[KBEntry]:
        """
        Get KB entries filtered by domain and/or keywords.

        Args:
            domain: Filter by domain (None = all domains)
            keywords: List of keywords to match in name, equation, or notes (case-insensitive)

        Returns:
            List of matching KBEntry objects
        """
        results = list(self._entries.values())
        if domain:
            results = [e for e in results if e.domain == domain]
        if keywords:
            kw_lower = [k.lower() for k in keywords]
            filtered = []
            for entry in results:
                text = " ".join([
                    entry.name or "",
                    entry.equation or "",
                    " ".join(entry.notes or []),
                ]).lower()
                if any(kw in text for kw in kw_lower):
                    filtered.append(entry)
            results = filtered
        return results

    def get_by_id(self, entry_id: str) -> KBEntry | None:
        """Get a specific entry by id."""
        return self._entries.get(entry_id)

    def get_all(self) -> List[KBEntry]:
        """Get all entries."""
        return list(self._entries.values())
