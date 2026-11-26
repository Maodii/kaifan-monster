"""Run the current native resource and utility release verifier."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("verify-utility-release.py")),run_name="__main__")
