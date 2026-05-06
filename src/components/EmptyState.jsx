export default function EmptyState({ icon = '○', title, desc, actionText, onAction }) {
  return (
    <section className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
      {actionText && (
        <button className="btn btn--primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </section>
  );
}
