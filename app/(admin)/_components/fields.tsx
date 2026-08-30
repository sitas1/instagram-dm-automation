export function Field({
  label,
  name,
  defaultValue,
  required,
  hint,
  type = "text",
  min,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  hint?: string;
  type?: "text" | "number" | "password" | "date";
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        min={min}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {hint && (
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        rows={3}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  required,
  defaultValue,
  hint,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        {children}
      </select>
      {hint && (
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {hint}
        </span>
      )}
    </label>
  );
}
