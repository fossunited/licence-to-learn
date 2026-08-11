with import <nixpkgs> { };

pkgs.mkShell {
  name = "licence-to-learn";

  nativeBuildInputs = [ pkgs.bashInteractive ];

  buildInputs = with pkgs; [
    # site generator
    zola
    # task runner (records the off-the-shelf CLI invocations; no logic to maintain)
    just
    # data: validate CSV against JSON Schema  +  pull sheets / convert docs
    qsv pandoc curl
    # search index: pdftotext/pdfinfo/pdftoppm + OCR for the scanned RTI replies
    # (~40% of them have no text layer). Driven by scripts/build-index.py.
    python3
    poppler_utils
    (tesseract.override { enableLanguages = [ "eng" "hin" ]; })
    # linters / formatters
    taplo # TOML
    typos # spellcheck
    htmltest # built-site link / alt / anchor checker
    nodejs # runtime for the node linters below
    stylelint markdownlint-cli prettier treefmt
  ];

  shellHook = ''
    echo "licence-to-learn dev shell — run 'just' to list tasks"
  '';
}
