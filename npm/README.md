# oregon-uhp-explainer

Code from the [Oregon Universal Health Plan explainer](https://malcom-io.github.io/oregon-uhp-explainer/),
starting with its household and employer calculator: what a household or an employer
would pay under each of the five financing models in the Universal Health Plan
Governance Board's draft report, beside what they pay today.

**Unofficial.** Not published, reviewed or endorsed by the Board or the State of Oregon.
Each version names the Board documents its numbers come from; see the
[changelog](https://github.com/Malcom-IO/oregon-uhp-explainer/blob/main/CHANGELOG.md).
Every input and the Board's own worked examples are on
[Check the numbers](https://github.com/Malcom-IO/oregon-uhp-explainer/blob/main/docs/numbers.md).

## Use

```sh
npm install oregon-uhp-explainer
```

The package's main import is the calculator. More of the explainer, such as the
calculation engine on its own, may be added under its own import path later.

```js
import { mount } from 'oregon-uhp-explainer';
import 'oregon-uhp-explainer/oregon-uhp.css';

const remove = mount(document.getElementById('uhp-calculator'), { theme: 'light', headingLevel: 2 });
```

`mount(host, options)` fills the host element and returns a function that removes the
calculator. It has no dependencies, sends nothing over the network and stores nothing.
Options, colors and themes are in the
[embedding guide](https://github.com/Malcom-IO/oregon-uhp-explainer/blob/main/docs/reuse.md).
Types are included.

## License and credit

MIT. Keep the license notice at the top of `oregon-uhp.js`; if your bundler moves
license comments into a separate file (Angular's `3rdpartylicenses.txt`, for example),
publish that file with your site. If you publish results,
please cite the project and its source snapshot:

> Oregon Universal Health Plan explainer and calculator (unofficial), October 2026
> drafts snapshot. https://github.com/Malcom-IO/oregon-uhp-explainer

Report a wrong number or an unfair description in the
[issues](https://github.com/Malcom-IO/oregon-uhp-explainer/issues).
