import { useToast } from '../store/toast';

export function Toast() {
  const { message, visible } = useToast();
  return (
    <div id="toast" role="status" aria-live="polite" className={visible ? 'show' : ''}>
      {message}
    </div>
  );
}
