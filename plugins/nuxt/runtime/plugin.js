import { defineNuxtPlugin } from '#app';
import * as jtcsv from 'jtcsv';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('jtcsv', jtcsv);
});
