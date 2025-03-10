# DiaMetrics (lite)

DiaMetrics (lite) is a web-based educational resource for exploring important concepts regarding binary classification (and its evaluation). While the "full" version is primarily intended for independent learning, the lite version is intended for use with direct instruction (e.g. in the context of lectures or talks).

[![DOI](https://zenodo.org/badge/726871158.svg)](https://doi.org/10.5281/zenodo.10607672)

## Installation & Usage

No installation is necessary. [Open DiaMetrics (lite) directly](https://lrosenplaenter.github.io/DiaMetrics_lite/). Alternatively: Simply download and open index.html in your browser or store all files on your web server.

If you actually publish DiaMetrics elsewhere (e.g. on your website, in another project, etc.) I would be happy to be [notified](https://orcid.org/0009-0001-4961-2281)!

### One and two-dimensional separators

**New in version v1.1.0**: In addition to the two-dimensional separator, a one-dimensional separator ("cut-off") can now also be used. You can switch between the separator modes in the settings or by setting parameters in the url.

### "Fairness-Mode"

In "fairness mode", the portions of groups A and B are additionally accentuated to illustrate aspects of fairness for subgroups in binary classification. The fairness mode can be activated via the settings or parameters in the url (see below).

### Customisation of the labelling of scales and groups, switching on/off "Fairness-Mode" & Separator-Mode

The naming of the groups and axes (or scales) can be changed via the settings directly on the page, or via parameters in the url. When the labelling is changed, a new url is automatically generated that contains the updated parameters and can be copied directly from the settings and can be passed on to third parties.

The parameters are:
* `vara`, `varb`, `varc` for the labels of groups A, B and C (Group C gets highlighted in fairness-mode).
* `mx`, `my` for the labels for the scales/ axes.
* `fair` can be set to "true" or "false", to switch on or off fairness mode.
* `sepm` can be set to "1d" for a one-dimensional separator ("cut-off") or to "2d" two-dimensional separator ("classification")

Example: [https://lrosenplaenter.github.io/DiaMetrics_lite/**?vara=Test&fair=true**](https://lrosenplaenter.github.io/DiaMetrics_lite?vara=Test&fair=true) switches on the fairness mode and sets the label for group A to "Test".

### Customisation of the data
The data displayed in the plot is defined via [*data.js*](https://github.com/lrosenplaenter/DiaMetrics_lite/blob/main/data.js). The data is organised in an object `ext_data` that contains three arrays (`data_a`; `data_b`; `data_overlay`). Each of the arrays contains 200 objects with x-y data pairs, which can be customised, added or removed as required.

`data_a` contains the data pairs for group A which are displayed in teal, and `data_b` contains the data pairs for group B which are displayed in grapefruit.

Note: `data_overlay` contains the data pairs that are to be highlighted in fairness mode. These should match individual data points from `data_a` and `data_b` accordingly.

## Versions

There are two other versions of DiaMetrics:

- **DiaMetrics** ([web](https://lrosenplaenter.github.io/DiaMetrics/) | [repository](https://github.com/lrosenplaenter/DiaMetrics)) is the full version of DiaMetrics which includes examples and more detailed explanations.
- **DiaMetrics_DE** ([web](https://lrosenplaenter.github.io/DiaMetrics_DE/) | [repository](https://github.com/lrosenplaenter/DiaMetrics_DE)) is the German version of DiaMetrics.

## Contributing

If you have found any bug or typo (or anything else that doesn't seem right) in DiaMetrics (lite), I would be happy to [be notified directly](https://orcid.org/0009-0001-4961-2281). You can also open an issue on github.

Note: Issues and pull requests are not actively monitored on a regular basis.

## Authors, citation and acknowledgments

DiaMetrics was developed by Leon Rosenplänter for teaching at the [Department of Psychological Diagnostics (Prof. Dr. Martin Kersting)](https://www.uni-giessen.de/de/fbz/fb06/psychologie/abt/p-diagnostik), [Justus-Liebig-University Giessen](https://www.uni-giessen.de), Germany. Many thanks to S. Bender and D. Bonarius for their essential feedback and corrections, greatly improving this project.

Please quote DieMetrics (lite) as follows: See [*CITATION.md*](https://github.com/lrosenplaenter/DiaMetrics_lite/blob/main/CITATION.cff)

DiaMetrics (lite) uses [Bootstrap](https://getbootstrap.com/) v5.3.1 for the design of the website and some visual functions.

DiaMetrics (lite) uses [Chart.js](https://www.chartjs.org) v4.4.0 to display the scatter plots.

DiaMetrics (lite) uses the [dragdata plugin for Chart.js](https://github.com/chrispahm/chartjs-plugin-dragdata) v2.2.3 to make the separator draggable.

## License

Copyright (c) 2024 - 2025 Leon Rosenplänter. DiaMetrics (lite) is available under the [MIT](https://choosealicense.com/licenses/mit/) license. The full text of the licence can be found in the [*LICENSE.md*](https://github.com/lrosenplaenter/DiaMetrics_lite/blob/main/LICENSE.md) file.
