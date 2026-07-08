"use client";

// Prints just one form+photos group out of a page that renders many. Every
// group (a form and its optional photo page) shares a `data-form-group`
// value; clicking here hides every OTHER group for the duration of the print
// job, then restores them once the print dialog closes.
export function PrintSingleButton({ groupId, label }: { groupId: string; label: string }) {
  function handlePrint() {
    const groups = document.querySelectorAll<HTMLElement>("[data-form-group]");
    const hidden: HTMLElement[] = [];

    groups.forEach((el) => {
      if (el.dataset.formGroup !== groupId) {
        el.classList.add("pms-print-hide");
        hidden.push(el);
      }
    });

    const restore = () => {
      hidden.forEach((el) => el.classList.remove("pms-print-hide"));
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);

    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background print:hidden"
    >
      {label}
    </button>
  );
}
