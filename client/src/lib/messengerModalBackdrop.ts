let openModalCount = 0;

export function lockMessengerPageScroll(): () => void {
  openModalCount += 1;
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    openModalCount = Math.max(0, openModalCount - 1);
    if (openModalCount === 0) {
      document.body.style.overflow = prev;
    }
  };
}
