export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-control border border-success/20 bg-success-soft px-3 py-2 text-sm text-success">
      {message}
    </p>
  );
}
