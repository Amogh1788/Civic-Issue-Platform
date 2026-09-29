import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p>The link may be wrong or the page may have moved.</p>
      <Link className="btn" to="/">Go to home</Link>
    </div>
  );
}
