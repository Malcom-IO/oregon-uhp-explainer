import { mount } from './index';

const host = document.querySelector<HTMLElement>('#calculator');
if (host) mount(host);
