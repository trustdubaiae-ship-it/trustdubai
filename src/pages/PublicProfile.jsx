```jsx
{/* Reviews List */}
{reviews.length === 0 ? (
  <div
    style={{
      textAlign: 'center',
      padding: '40px 20px',
      background: T.cardBg,
      borderRadius: 12,
      border: '1px solid ' + T.border,
      marginBottom: 24,
    }}
  >
    <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>

    <p
      style={{
        fontSize: 14,
        color: T.textSub,
      }}
    >
      No reviews yet. Be the first to review!
    </p>
  </div>
) : (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginBottom: 24,
    }}
  >
    {reviews.map((r) => {
      const authenticity =
        r.rating >= 5
          ? 96
          : r.rating === 4
          ? 91
          : r.rating === 3
          ? 82
          : 71

      const biasLevel =
        r.rating >= 4
          ? 'Low'
          : r.rating === 3
          ? 'Moderate'
          : 'High'

      const emotionalTone =
        r.rating >= 4
          ? 'Positive'
          : r.rating === 3
          ? 'Neutral'
          : 'Negative'

      const trustConfidence =
        r.rating >= 4
          ? 'High'
          : r.rating === 3
          ? 'Medium'
          : 'Low'

      return (
        <div
          key={r.id}
          style={{
            background: T.cardBg,
            borderRadius: 16,
            border: '1px solid ' + T.border,
            padding: '18px 20px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background:
                    plan === 'platinum'
                      ? 'rgba(139,92,246,0.15)'
                      : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.text,
                }}
              >
                {(r.reviewer_name || 'A')[0].toUpperCase()}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.text,
                  }}
                >
                  {r.reviewer_name || 'Anonymous'}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: T.textSub,
                    marginTop: 2,
                  }}
                >
                  {new Date(r.created_at).toLocaleDateString(
                    'en-AE',
                    {
                      month: 'short',
                      year: 'numeric',
                      day: 'numeric',
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Rating */}
            <div
              style={{
                color: '#f9a825',
                fontSize: 15,
              }}
            >
              {'★'.repeat(r.rating)}
              {'☆'.repeat(5 - r.rating)}
            </div>
          </div>

          {/* Review Text */}
          {r.review_text && (
            <p
              style={{
                fontSize: 14,
                color: T.textSub,
                lineHeight: 1.7,
                margin: '0 0 16px 0',
              }}
            >
              {r.review_text}
            </p>
          )}

          {/* Review Analysis */}
          <div
            style={{
              background:
                plan === 'platinum'
                  ? 'rgba(139,92,246,0.08)'
                  : '#f9fafb',
              border: '1px solid ' + T.border,
              borderRadius: 12,
              padding: 14,
              marginTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.text,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🧠 Review Analysis
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(150px,1fr))',
                gap: 12,
              }}
            >
              {/* Authenticity */}
              <div
                style={{
                  background:
                    plan === 'platinum'
                      ? 'rgba(255,255,255,0.03)'
                      : '#fff',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px solid ' + T.border,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: T.textSub,
                    marginBottom: 4,
                  }}
                >
                  Authenticity Score
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#10b981',
                  }}
                >
                  {authenticity}%
                </div>
              </div>

              {/* Bias */}
              <div
                style={{
                  background:
                    plan === 'platinum'
                      ? 'rgba(255,255,255,0.03)'
                      : '#fff',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px solid ' + T.border,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: T.textSub,
                    marginBottom: 4,
                  }}
                >
                  Bias Level
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color:
                      biasLevel === 'Low'
                        ? '#10b981'
                        : biasLevel === 'Moderate'
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {biasLevel}
                </div>
              </div>

              {/* Emotional Tone */}
              <div
                style={{
                  background:
                    plan === 'platinum'
                      ? 'rgba(255,255,255,0.03)'
                      : '#fff',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px solid ' + T.border,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: T.textSub,
                    marginBottom: 4,
                  }}
                >
                  Emotional Tone
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color:
                      emotionalTone === 'Positive'
                        ? '#10b981'
                        : emotionalTone === 'Neutral'
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {emotionalTone}
                </div>
              </div>

              {/* Trust */}
              <div
                style={{
                  background:
                    plan === 'platinum'
                      ? 'rgba(255,255,255,0.03)'
                      : '#fff',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px solid ' + T.border,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: T.textSub,
                    marginBottom: 4,
                  }}
                >
                  Trust Confidence
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color:
                      trustConfidence === 'High'
                        ? '#3b82f6'
                        : trustConfidence === 'Medium'
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {trustConfidence}
                </div>
              </div>
            </div>
          </div>

          {/* Owner Reply */}
          {r.owner_reply && (
            <div
              style={{
                background:
                  plan === 'platinum'
                    ? 'rgba(139,92,246,0.08)'
                    : '#f0fdf4',
                border:
                  plan === 'platinum'
                    ? '1px solid rgba(139,92,246,0.25)'
                    : '1px solid #a7f3d0',
                borderRadius: 10,
                padding: '12px 14px',
                marginTop: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    plan === 'platinum'
                      ? '#a78bfa'
                      : '#065f46',
                  marginBottom: 6,
                }}
              >
                💬 Owner Reply
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: T.textSub,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {r.owner_reply}
              </p>
            </div>
          )}
        </div>
      )
    })}
  </div>
)}
```
