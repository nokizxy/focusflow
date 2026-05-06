import { useEffect, useRef, useState } from 'react';

export default function StepList({ taskId, steps, onUpdateStep }) {
  const [editingStepId, setEditingStepId] = useState('');
  const titleInputRef = useRef(null);

  useEffect(() => {
    setEditingStepId('');
  }, [taskId]);

  useEffect(() => {
    if (editingStepId) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingStepId]);

  return (
    <div className="step-list">
      {steps.map((step, index) => {
        const isEditing = editingStepId === step.id;

        return (
          <article
            className={[
              'step-row',
              step.isWinningLine ? 'step-row--winning' : '',
              step.done ? 'step-row--done' : '',
              isEditing ? 'step-row--editing' : ''
            ].filter(Boolean).join(' ')}
            key={step.id}
          >
            <input
              type="checkbox"
              checked={step.done}
              aria-label={`勾选步骤 ${index + 1}`}
              onChange={(event) =>
                onUpdateStep(taskId, step.id, { done: event.target.checked })
              }
            />
            {isEditing ? (
              <>
                <div className="step-row__body">
                  <div className="step-row__title-line">
                    <span>{index + 1}</span>
                    <small className="step-row__editing-badge">编辑中</small>
                    <input
                      ref={titleInputRef}
                      value={step.title}
                      onChange={(event) =>
                        onUpdateStep(taskId, step.id, { title: event.target.value })
                      }
                    />
                  </div>
                  <input
                    className="step-row__detail"
                    value={step.detail || ''}
                    onChange={(event) =>
                      onUpdateStep(taskId, step.id, { detail: event.target.value })
                    }
                    placeholder={step.isWinningLine ? '做到这里就算赢。' : '这一步的可见产出...'}
                  />
                </div>
                <div className="step-row__side">
                  <label className="step-row__minutes">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={step.minutes}
                      onChange={(event) =>
                        onUpdateStep(taskId, step.id, { minutes: Number(event.target.value) })
                      }
                    />
                    <span>分钟</span>
                  </label>
                  <button
                    className="step-row__edit step-row__edit--done"
                    type="button"
                    onClick={() => setEditingStepId('')}
                  >
                    保存
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  className="step-row__body step-row__body--read"
                  type="button"
                  onClick={() => setEditingStepId(step.id)}
                >
                  <div className="step-row__title-line">
                    <span>{index + 1}</span>
                    <strong>{step.title}</strong>
                  </div>
                  <p className="step-row__detail-text">
                    {step.detail || (step.isWinningLine ? '做到这里就算赢。' : '这一步有可见产出。')}
                  </p>
                </button>
                <div className="step-row__side">
                  <span className="step-row__duration">{step.minutes} 分钟</span>
                  <button
                    className="step-row__edit"
                    type="button"
                    onClick={() => setEditingStepId(step.id)}
                  >
                    编辑
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
