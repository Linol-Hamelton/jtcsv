import { useNuxtApp } from '#app';

export const useJtcsv = () => {
  const { $jtcsv } = useNuxtApp();
  return $jtcsv;
};
