interface MainWorkspaceProps {
  inputPanel: React.ReactNode;
  spreadsheetPanel: React.ReactNode;
}

export function MainWorkspace({
  inputPanel,
  spreadsheetPanel,
}: MainWorkspaceProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Left Panel: Input Area (WhatsApp Chat) */}
      <section className="flex flex-col border-b lg:w-[350px] lg:border-b-0 lg:border-r xl:w-[400px]">
        {inputPanel}
      </section>

      {/* Right Panel: Spreadsheet View */}
      <section className="flex flex-1 flex-col overflow-hidden bg-muted/30">
        {spreadsheetPanel}
      </section>
    </div>
  );
}
