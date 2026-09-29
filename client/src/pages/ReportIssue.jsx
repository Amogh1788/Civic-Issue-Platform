import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { CATEGORIES, mapLink } from '../utils/format';
import { CodeTag } from '../components/Badges';

const MAX_PHOTO_MB = 5;

export default function ReportIssue() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [location, setLocation] = useState({ latitude: '', longitude: '' });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Free the preview URL when the photo changes
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Photo must be a JPG, PNG or WEBP image');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`Photo must be smaller than ${MAX_PHOTO_MB} MB`);
      return;
    }
    setError('');
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Your browser cannot share location. Enter the coordinates instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        });
        setLocating(false);
      },
      () => {
        setError('Location permission was denied. Allow it in the browser, or enter the coordinates.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!category) return setError('Choose what kind of issue this is');
    if (description.trim().length < 10) return setError('Describe the issue in at least 10 characters');
    if (!photo) return setError('Add a photo of the issue');
    if (location.latitude === '' || location.longitude === '') return setError('Add the location of the issue');

    const data = new FormData();
    data.append('category', category);
    data.append('description', description.trim());
    data.append('address', address.trim());
    data.append('latitude', location.latitude);
    data.append('longitude', location.longitude);
    data.append('photo', photo);

    setSubmitting(true);
    try {
      const res = await api.post('/complaints', data);
      setResult(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="narrow submitted">
        <h1>Complaint submitted</h1>
        <p>Your complaint ID is</p>
        <CodeTag code={result.complaint.complaint_code} />
        {result.duplicateOf ? (
          <p className="alert info">
            Someone already reported this issue nearby as <strong>{result.duplicateOf}</strong>.
            Your report was added to it, which raises its priority. You will get the same updates.
          </p>
        ) : (
          <p className="muted">Keep this ID to follow up with the municipal office.</p>
        )}
        <div className="actions">
          <button className="btn primary" onClick={() => navigate(`/complaints/${result.complaint.id}`)}>
            Track this complaint
          </button>
          <Link className="btn" to="/complaints">See all my complaints</Link>
        </div>
      </div>
    );
  }

  const hasLocation = location.latitude !== '' && location.longitude !== '';

  return (
    <div className="narrow">
      <h1>Report an issue</h1>
      <p className="muted">A clear photo and an accurate location help the authority find and fix it faster.</p>

      <form className="panel" onSubmit={handleSubmit} noValidate>
        {error && <p className="alert error" role="alert">{error}</p>}

        <fieldset>
          <legend>What is the problem?</legend>
          <div className="category-grid">
            {CATEGORIES.map((c) => (
              <label key={c.value} className={`category-option ${category === c.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="category"
                  value={c.value}
                  checked={category === c.value}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <span className="category-icon" aria-hidden="true">{c.icon}</span>
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Description
          <textarea
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="How big is it, how long has it been there, is it dangerous?"
          />
          <span className="hint">{description.length}/1000</span>
        </label>

        <fieldset>
          <legend>Photo</legend>
          <label className="photo-drop">
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhoto} />
            {preview ? (
              <img src={preview} alt="Selected issue" />
            ) : (
              <span>Take or choose a photo (JPG, PNG or WEBP, up to {MAX_PHOTO_MB} MB)</span>
            )}
          </label>
        </fieldset>

        <fieldset>
          <legend>Location</legend>
          <button type="button" className="btn" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Finding your location…' : 'Use my current location'}
          </button>
          <div className="row-2">
            <label>
              Latitude
              <input
                inputMode="decimal"
                value={location.latitude}
                onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                placeholder="19.107600"
              />
            </label>
            <label>
              Longitude
              <input
                inputMode="decimal"
                value={location.longitude}
                onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                placeholder="72.837300"
              />
            </label>
          </div>
          {hasLocation && (
            <a className="small-link" href={mapLink(location.latitude, location.longitude)} target="_blank" rel="noreferrer">
              Check this spot on the map
            </a>
          )}
          <label>
            Landmark or address <span className="optional">optional</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Near the bus stop on SV Road" />
          </label>
        </fieldset>

        <button className="btn primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>
    </div>
  );
}
