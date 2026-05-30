import { Component, type ErrorInfo, type ReactNode } from "react";
import type { ProfileDesign } from "./profileDesign";

type Props = {
  d: ProfileDesign;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
};

type State = { error: Error | null };

/** Не даём падению TipTap «убить» весь /profile. */
export class ProfileNotepadErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ProfileNotepad]", error, info.componentStack);
  }

  private resetPlain = () => {
    this.props.onChange("");
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { d } = this.props;
    return (
      <div className={`space-y-3 p-4 ${d.insetGroup} ${d.noticeDanger}`}>
        <p className="text-[0.875rem] font-medium">Не удалось открыть редактор блокнота</p>
        <p className={`text-[0.8125rem] leading-relaxed ${d.muted}`}>
          Возможно, повреждены сохранённые заметки. Сбросьте блокнот или откройте другой раздел профиля.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={d.btnPrimary} onClick={this.resetPlain}>
            Очистить блокнот
          </button>
          <button type="button" className={d.btnSecondary} onClick={() => this.setState({ error: null })}>
            Повторить
          </button>
        </div>
      </div>
    );
  }
}
