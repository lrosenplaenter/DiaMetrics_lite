/*
 * DiaMetrics (lite) v1.0.0
 * https://github.com/lrosenplaenter/DiaMetrics_lite
 * Copyright (c) 2024 Leon Rosenplänter. 
 * DiaMetrics is available under the MIT license.
 */

/*** Define Plot ***/
var data = {
    datasets: []
};

// vars used to limit the rate of calls while dragging the separator
var throttleTimeout;
var throttleDelay = 50; //delay between calls while dragging the separator in ms

// configuration of scatter-plot
var new_coordinates; // var to hold values of new points calculated on drag of the seperator
var options = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
        x: {
            type: 'linear',
            position: 'bottom',
            title: {
                display: true,
                text: 'X-Axis',
            },
        },
        y: {
            type: 'linear',
            position: 'left',
            title: {
                display: true,
                text: 'Y-Axis',
            },
            max: null,
        }
    },
    plugins: {
        tooltip: {
            enabled: false
        },
        legend: {
            labels: {
                filter: item => item.text !== 'none'
            }
        },
        dragData: {
            dragX: true,
            dragY: null,
            onDragStart: (event) => {
                event.target.style.cursor = 'grabbing'
                scatterChart.options.animation = false;
                scatterChart.update();
            },
            onDrag: () => {
                if (!throttleTimeout) {
                    // call the functions max x-times per second
                    throttleTimeout = setTimeout(() => {
                        // get linear equation from the points of the blue line
                        determine_equation();
                        // update the separator on drag, if separator-mode is set to 1d ("cut-off") -mode
                        if (separator_mode == '1d') {
                            scatterChart.data.datasets[2].data[0].x = new_coordinates[0].x_value    
                            scatterChart.data.datasets[2].data[1].x = new_coordinates[1].x_value
                            scatterChart.update();
                        }

                        // calc spec, sens, ... 
                        calc();
            
                        throttleTimeout = null;
                    }, throttleDelay);
                }
            },
            onDragEnd: (event) => {
                event.target.style.cursor = 'default'
                scatterChart.options.animation = true;
                scatterChart.update();
                // update the separator after drag to fit the whole canvas (data generated while dragging with determine_equation())
                scatterChart.data.datasets[2].data[0].x = new_coordinates[0].x_value    
                scatterChart.data.datasets[2].data[0].y = new_coordinates[0].y_value
                scatterChart.data.datasets[2].data[1].x = new_coordinates[1].x_value
                scatterChart.data.datasets[2].data[1].y = new_coordinates[1].y_value
                scatterChart.update();
            }
        }
    }
};

// create the scatter-plot
var ctx = document.getElementById('scatterChart').getContext('2d');

if (typeof(scatterChart) != 'undefined') {
    scatterChart.update()
} else {
    var scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: data,
        options: options
    });
}

// declaring diagram variables
var label_A = "Group A"
var label_B = "Group B"
var label_C = "Group C"
var label_scale_X = "Metric X"
var label_scale_Y = "Metric Y"
var data_A = ext_data.data_a
var data_B = ext_data.data_b
var data_C = ext_data.data_overlay
var sample_size_A = ext_data.data_a.length
var sample_size_B = ext_data.data_b.length
var color_A = '#008080'
var color_B = '#FF6F61'
var separator_m = null;
var separator_b = null;
var fairness_mode = false;
var separator_mode = "1d";

/*** get params from URL and parse into variables ***/
read_url ();
function read_url () {
    const currentUrl = new URL(window.location.href);
    const urlSearchParams = currentUrl.searchParams;

    const params = ["vara", "varb", "varc", "mx", "my", "fair", "sepm"];
    const labels = ["label_A", "label_B", "label_C", "label_scale_X", "label_scale_Y", "fairness_mode", "separator_mode"];

    const values = params.map(param => {
        const value = urlSearchParams.get(param);
        return (value !== null && typeof value === "string" && value.trim() !== "") ? value : null;
    });

    values.forEach((value, index) => {
        if (value !== null) {
            window[labels[index]] = value;
        }
    });

    // fill in the information from url params into one-site settings view
    set_settings();
}

// fill in the information from url params into one-site settings view
function set_settings() {
    // Labels
    document.getElementById('name_group_a').value = label_A;
    document.getElementById('name_group_b').value = label_B;
    document.getElementById('name_axis_x').value = label_scale_X;
    document.getElementById('name_axis_y').value = label_scale_Y;
    document.getElementById('name_group_c').value = label_C;

    //Separator-Mode-Swich
    if (separator_mode == "1d") {
        document.getElementById('switch_separator_mode').value = "1d";
    } else if (separator_mode == "2d") {
        document.getElementById('switch_separator_mode').value = "2d";
    }

    //Fairness-Mode-Switch
    if (fairness_mode == "true") {
        document.getElementById('switch_fairness').checked = true;
        document.getElementById("name_group_c").disabled = false;
    } else {
        document.getElementById('switch_fairness').checked = false;
        document.getElementById("name_group_c").disabled = true;
    }
    
    //URL
    generate_url();
}

/*** Display device warning if nessecary ***/
if (window.innerWidth <= 768) {
    display_device_alert ();
} else if (!window.matchMedia('(pointer:fine)').matches) {
    display_device_alert ();
}

//display_device_alert()
function display_device_alert() {
    var modal = new bootstrap.Modal(document.getElementById('device-warning'));
    modal.show();
}

generate_data()
/*** generating data depending on the picked example & other funtionality ***/
function generate_data () {

    var datasets = [
        {   
            // xy-pairs for var A
            label: label_A,
            data: data_A,
            backgroundColor: color_A,
            type: 'scatter',
            dragData: false,
        },
        {
            // xy-pairs for var B
            label: label_B,
            data: data_B,
            backgroundColor: color_B,
            type: 'scatter',
            dragData: false,
        },
    ]

    //set the data & Axis labels
    scatterChart.data.datasets = datasets;
    scatterChart.options.scales.x.title.text = label_scale_X;
    scatterChart.options.scales.y.title.text = label_scale_Y;
    scatterChart.update();

    // determine data-ppints for seperator (1d, 2d) + mode related settings
    let point_style;
    let point_radius;
    if (separator_mode == '1d') {
        data_C = seperator_position();
        scatterChart.options.scales.y.max = scatterChart.scales.y.max;
        scatterChart.options.plugins.dragData.dragY = false;
        throttleDelay = 0;
        point_style = 'rectRot'
        point_radius = 8;
    } else if (separator_mode == '2d') {
        data_C = linear_regression();
        scatterChart.options.scales.y.max = null;
        scatterChart.options.plugins.dragData.dragY = true;
        throttleDelay = 50;
        point_style = 'round';
        point_radius = 6;
    }
    
    datasets.push(
        {
            // xy-pairs for separator
            label: 'none',
            data: data_C,
            borderColor: '#3366FF',
            type: 'line',
            fill: false,
            dragData: true,
            pointRadius: point_radius,
            borderCapStyle: 'round',
            pointHitRadius: 25,
            pointStyle: point_style,
        },
    )

    scatterChart.data.datasets = datasets;
    scatterChart.update();

    if (fairness_mode == "true") {
        datasets.push(
            {
                // xy-pairs additional markings in the plot
                label: label_C,
                data: ext_data.data_overlay,
                borderColor: 'black',
                backgroundColor: 'transparent',
                pointStyle: 'round',
                pointRadius: 3.5,
                borderWidth: 1.5,
                dragData: false,
            },
        )
    
        scatterChart.data.datasets = datasets;
        scatterChart.update();
    }

    // activate buttons & text
    activate_interface(); 
    // calc metrics
    calc();
    // Adapt the content of the popovers to the example
    set_popover_content ();
    // resize canvas
    resize_canvas();
}

// calc the linear equation (blue line) and reset point depending on calulated variable to axis values
function determine_equation() {
    if (separator_mode == '1d') {
        var ax = scatterChart.data.datasets[2].data[0].x
        const y_axis_min = scatterChart.scales.y.min
        const y_axis_max = scatterChart.scales.y.max

        new_coordinates = [{x_value: ax, y_value: y_axis_min},{x_value: ax, y_value: y_axis_max + 5}]

    } else if (separator_mode == '2d') {
        // get the data Points from the chart-object
        var ax = scatterChart.data.datasets[2].data[0].x
        var ay = scatterChart.data.datasets[2].data[0].y
        var bx = scatterChart.data.datasets[2].data[1].x
        var by = scatterChart.data.datasets[2].data[1].y

        var coordinates = [{x_value: ax, y_value: ay},{x_value: bx, y_value: by}]

        // y = x * m + b

        // calc deviation from point to point 
        var deviation_y = coordinates[1].y_value - coordinates[0].y_value
        var deviation_x = coordinates[1].x_value - coordinates[0].x_value

        // calc slope
        var m = deviation_y / deviation_x
        separator_m = m //set value to global var

        // calc intercept
        var b = -m * coordinates[0].x_value + coordinates[0].y_value
        separator_b = b

        // calculate the new points of the linear line and update the plot
        // get min & max value of the x axis
        var x_axis_min = scatterChart.scales.x.min
        var x_axis_max = scatterChart.scales.x.max

        // calc y-values for min & max values of x axis
        var ay = x_axis_min * m + b
        var by = x_axis_max * m + b
        new_coordinates = [{x_value: x_axis_min, y_value: ay},{x_value: x_axis_max, y_value: by}]
    }
}

// stich pairs of values together in an object, and return those as an array
function pair_x_y (x, y) {
    var data = []
    for (var i in x) {
        var result = {x: x[i], y: y[i]}
        data.push(result)
    }
    return data;
}

// in case the seperator is set to "classification" (2d)-mode, determine data-points 
// get the linear regression to describe the trends of the data
function linear_regression() {
    // Combine the two arrays depending on the example
    let data = [].concat(data_A,data_B)
    
    // calc means of x and y
    let sum_X = 0;
    let sum_Y = 0;
    for (let i = 0; i < data.length; i++) {
        sum_X += data[i].x;
        sum_Y += data[i].y;
    }
    const mean_X = sum_X / data.length;
    const mean_Y = sum_Y / data.length;

    // calc slope (m) & intercept (b)
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < data.length; i++) {
        const x_Diff = data[i].x - mean_X;
        const y_Diff = data[i].y - mean_Y;
        numerator += x_Diff * y_Diff;
        denominator += x_Diff * x_Diff;
    }
    const m = numerator / denominator;
    separator_m = m //set to global var
    const b = mean_Y - m * mean_X;
    separator_b = b //set to global var

    // Calc Points for the separator
    // get min & max value of the x axis
    var x_axis_min = scatterChart.scales.x.min
    var x_axis_max = scatterChart.scales.x.max
    // calc y-values for min & max values of x axis
    var ay = x_axis_min * m + b
    var by = x_axis_max * m + b

    var result = [{x: x_axis_min, y: ay},{x: x_axis_max, y: by}]
    return result;
}

// in case the seperator is set to "cut-off" (1d)-mode, determine data-points 
function seperator_position () {
    let data = [].concat(data_A,data_B)

    // calc means of y
    let sum_X = 0;
    for (let i = 0; i < data.length; i++) {
        sum_X += data[i].x;
    }
    const mean_X = sum_X / data.length;
    const y_axis_min = scatterChart.scales.y.min
    const y_axis_max = scatterChart.scales.y.max

    var result = [{x: mean_X, y: y_axis_min},{x: mean_X, y: y_axis_max + 5}]
    console.log(result)
    return result;
}

//reset the separator-line on button click
function reset_separator () {
    scatterChart.data.datasets[2].data = linear_regression();
    scatterChart.update();
    calc();
}

function calc () {
    console.log("HUHU")
    // get data from X (A) & Y (B), depending on the example
    var data_X = scatterChart.data.datasets[0].data
    var data_Y = scatterChart.data.datasets[1].data

    var num_above_X = 0;
    var num_below_X = 0;
    var num_above_Y = 0;
    var num_below_Y = 0;

    // get point above and below the separator depending on the separator-mode
    if (separator_mode == '1d') {
        var cutoff = scatterChart.data.datasets[2].data[0].x
        console.log(cutoff)
        // count points above & below separator for X
        for (var i in data_X) {
            if (data_X[i].x >= cutoff) {
                num_above_X ++;
            } else if (data_X[i].x < cutoff) {
                num_below_X ++;
            }
        }

        // count points above & below separator for Y
        for (var i in data_Y) {
            if (data_Y[i].x >= cutoff) {
                num_above_Y ++;
            } else if (data_Y[i].x < cutoff) {
                num_below_Y ++;
            }
        }

    } else if (separator_mode == '2d') {
        // count points above & below separator for X
        for (var i in data_X) {
            var y = data_X[i].x * separator_m + separator_b // y = x * m + b
            if (data_X[i].y >= y) {
                num_above_X ++;
            } else if (data_X[i].y < y) {
                num_below_X ++;
            }
        }

        // count points above & below separator for Y
        for (var i in data_Y) {
            var y = data_Y[i].x * separator_m + separator_b // y = x * m + b
            if (data_Y[i].y >= y) {
                num_above_Y ++;
            } else if (data_Y[i].y < y) {
                num_below_Y ++;
            }
        }
    }

    // Fill in contingency-table
    
    var con_table_X = {total: sample_size_A + sample_size_B, actual_group_A: sample_size_A, actual_group_B: sample_size_B, results_pos: 0, results_neg: 0, true_pos: 0, false_pos: 0, true_neg: 0, false_neg: 0}
    var con_table_Y = {total: sample_size_A + sample_size_B, actual_group_A: sample_size_A, actual_group_B: sample_size_B, results_pos: 0, results_neg: 0, true_pos: 0, false_pos: 0, true_neg: 0, false_neg: 0}
    
    // Con-Table for Var A
    con_table_X.true_pos =  num_above_X
    con_table_X.false_pos =  num_above_Y
    con_table_X.true_neg =  num_below_Y
    con_table_X.false_neg =  num_below_X
    con_table_X.results_pos = con_table_X.true_pos + con_table_X.false_pos
    con_table_X.results_neg = con_table_X.true_neg + con_table_X.false_neg

    // Con-Table for Var B
    con_table_Y.true_pos = num_below_Y
    con_table_Y.false_pos = num_below_X
    con_table_Y.true_neg = num_above_X
    con_table_Y.false_neg = num_above_Y
    con_table_Y.results_pos = con_table_Y.true_pos + con_table_Y.false_pos
    con_table_Y.results_neg = con_table_Y.true_neg + con_table_Y.false_neg

    // show the data in the html table
    // Table for Var A
    document.getElementById('con_table_A_true_pos').innerHTML = con_table_X.true_pos
    document.getElementById('con_table_A_false_pos').innerHTML = con_table_X.false_pos
    document.getElementById('con_table_A_true_neg').innerHTML = con_table_X.true_neg
    document.getElementById('con_table_A_false_neg').innerHTML = con_table_X.false_neg
    document.getElementById('con_table_A_VarA_n').innerHTML = con_table_X.actual_group_A
    document.getElementById('con_table_A_VarB_n').innerHTML = con_table_X.actual_group_B
    document.getElementById('con_table_A_pos_results_n').innerHTML = con_table_X.results_pos
    document.getElementById('con_table_A_neg_results_n').innerHTML = con_table_X.results_neg

    // Table for Var B
    document.getElementById('con_table_B_true_pos').innerHTML = con_table_Y.true_pos
    document.getElementById('con_table_B_false_pos').innerHTML = con_table_Y.false_pos
    document.getElementById('con_table_B_true_neg').innerHTML = con_table_Y.true_neg
    document.getElementById('con_table_B_false_neg').innerHTML = con_table_Y.false_neg
    document.getElementById('con_table_B_VarA_n').innerHTML = con_table_Y.actual_group_A
    document.getElementById('con_table_B_VarB_n').innerHTML = con_table_Y.actual_group_B
    document.getElementById('con_table_B_pos_results_n').innerHTML = con_table_Y.results_pos
    document.getElementById('con_table_B_neg_results_n').innerHTML = con_table_Y.results_neg

    // calc metrics
    var to_calc = [];
    var elems = [];
    var results = [
        {name: "sensi", elem_A: document.getElementById('sensA'), elem_B: document.getElementById('sensB'), value_A: null, value_B: null},
        {name: "speci", elem_A: document.getElementById('specA'), elem_B: document.getElementById('specB'), value_A: null, value_B: null},
        {name: "miss", elem_A: document.getElementById('missA'), elem_B: document.getElementById('missB'), value_A: null, value_B: null},
        {name: "fale", elem_A: document.getElementById('faleA'), elem_B: document.getElementById('faleB'), value_A: null, value_B: null},
        {name: "ppv", elem_A: document.getElementById('ppvA'), elem_B: document.getElementById('ppvB'), value_A: null, value_B: null},
        {name: "npv", elem_A: document.getElementById('npvA'), elem_B: document.getElementById('npvB'), value_A: null, value_B: null},
        {name: "fdr", elem_A: document.getElementById('fdrA'), elem_B: document.getElementById('fdrB'), value_A: null, value_B: null},
        {name: "for", elem_A: document.getElementById('forA'), elem_B: document.getElementById('forB'), value_A: null, value_B: null},
        {name: "plr", elem_A: document.getElementById('plrA'), elem_B: document.getElementById('plrB'), value_A: null, value_B: null},
        {name: "nlr", elem_A: document.getElementById('nlrA'), elem_B: document.getElementById('nlrB'), value_A: null, value_B: null},
        {name: "dodds", elem_A: document.getElementById('doddsA'), elem_B: document.getElementById('doddsB'), value_A: null, value_B: null},
        {name: "youden", elem_A: document.getElementById('youdenA'), elem_B: document.getElementById('youdenB'), value_A: null, value_B: null},
        {name: "accu", elem_A: document.getElementById('accuA'), elem_B: document.getElementById('accuB'), value_A: null, value_B: null},
        {name: "f1", elem_A: document.getElementById('f1A'), elem_B: document.getElementById('f1B'), value_A: null, value_B: null},
    ];

    /** get info on which values to calc **/
    var checkboxes = [
        {cb:1 , class: "visability_sensi_speci" , calc: ["sensi", "speci"]},
        {cb:2 , class: "visability_miss_fale" , calc: ["miss", "fale"]},
        {cb:3 , class: "visability_ppv_npv" , calc: ["ppv", "npv"]},
        {cb:4 , class: "visability_fdr_for" , calc: ["fdr", "for"]},
        {cb:5 , class: "visability_plr_nlr" , calc: ["sensi", "speci","miss", "fale","plr", "nlr"]},
        {cb:6 , class: "visability_dodds_youden" , calc: ["sensi", "speci","miss", "fale","plr", "nlr","dodds", "youden"]},
        {cb:7 , class: "visability_accu_F1" , calc: ["accu", "f1"]},
    ];
    
    // get all elems 
    for (var i in checkboxes) {
        var found_elems = document.querySelectorAll("." + checkboxes[i].class);
            elems.push(found_elems[0])
    }

    // check if elems are visible, if yes push name of the value to calc into the to_calc var
    for (var i in elems) {
        if (elems[i].style.display !== "none") {
            for (var j in checkboxes) {
                if (elems[i].classList.contains(checkboxes[j].class)) {
                    for (var k in checkboxes[j].calc) {
                        if(!to_calc.includes(checkboxes[j].calc[k])) {
                            to_calc.push(checkboxes[j].calc[k])
                        }   
                    }
                }
            }
        }
    }

    /** calc selected metrics **/
    // calc values for each selected metric by iteratring through the to_calc array and writing the results into results array
    for (var i in to_calc) {
        if (to_calc[i] == "sensi") {
            results[0].value_A = con_table_X.true_pos / con_table_X.actual_group_A
            results[0].value_B = con_table_Y.true_pos / con_table_Y.actual_group_B
        } else if (to_calc[i] == "speci") {
            results[1].value_A = con_table_X.true_neg / con_table_X.actual_group_B
            results[1].value_B = con_table_Y.true_neg / con_table_Y.actual_group_A
        } else if (to_calc[i] == "miss") {
            results[2].value_A = con_table_X.false_neg / con_table_X.actual_group_A
            results[2].value_B = con_table_Y.false_neg / con_table_Y.actual_group_B
        } else if (to_calc[i] == "fale") {
            results[3].value_A = con_table_X.false_pos / con_table_X.actual_group_B
            results[3].value_B = con_table_Y.false_pos / con_table_Y.actual_group_A
        } else if (to_calc[i] == "ppv") {
            results[4].value_A = con_table_X.true_pos / con_table_X.results_pos
            results[4].value_B = con_table_Y.true_pos / con_table_Y.results_pos
        } else if (to_calc[i] == "npv") {
            results[5].value_A = con_table_X.true_neg / con_table_X.results_neg
            results[5].value_B = con_table_Y.true_neg / con_table_Y.results_neg
        } else if (to_calc[i] == "fdr") {
            results[6].value_A = con_table_X.false_pos / con_table_X.results_pos
            results[6].value_B = con_table_Y.false_pos / con_table_Y.results_pos
        } else if (to_calc[i] == "for") {
            results[7].value_A = con_table_X.false_neg / con_table_X.results_neg
            results[7].value_B = con_table_Y.false_neg / con_table_Y.results_neg
        } else if (to_calc[i] == "plr") {
            results[8].value_A = results[0].value_A / (1 - results[1].value_A)
            results[8].value_B = results[0].value_B / (1 - results[1].value_B)
        } else if (to_calc[i] == "nlr") {
            results[9].value_A = (1 - results[0].value_A) / results[1].value_A
            results[9].value_B = (1 - results[0].value_B) / results[1].value_B
        } else if (to_calc[i] == "dodds") {
            results[10].value_A = results[8].value_A / results[9].value_A
            results[10].value_B = results[8].value_B / results[9].value_B
        } else if (to_calc[i] == "youden") {
            results[11].value_A = results[0].value_A + results[1].value_A -1
            results[11].value_B = results[0].value_B + results[1].value_B -1
        } else if (to_calc[i] == "accu") {
            results[12].value_A = (con_table_X.true_pos + con_table_X.true_neg) / con_table_X.total
            results[12].value_B = (con_table_Y.true_pos + con_table_Y.true_neg) / con_table_Y.total
        } else if (to_calc[i] == "f1") {
            results[13].value_A = (2 * con_table_X.true_pos) / (2 * con_table_X.true_pos + con_table_X.false_pos + con_table_X.false_neg)
            results[13].value_B = (2 * con_table_Y.true_pos) / (2 * con_table_Y.true_pos + con_table_Y.false_pos + con_table_Y.false_neg)
        } 
    }

    // display the values in html, for var A and B, use placeholders for infinity or NaN
    var placeholder_not_possible = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>'
    var placeholder_infinity = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-infinity" viewBox="0 0 16 16"><path d="M5.68 5.792 7.345 7.75 5.681 9.708a2.75 2.75 0 1 1 0-3.916ZM8 6.978 6.416 5.113l-.014-.015a3.75 3.75 0 1 0 0 5.304l.014-.015L8 8.522l1.584 1.865.014.015a3.75 3.75 0 1 0 0-5.304l-.014.015L8 6.978Zm.656.772 1.663-1.958a2.75 2.75 0 1 1 0 3.916L8.656 7.75Z"/></svg>'
    for (var i in results) {
        if (results[i].value_A == null || isNaN(results[i].value_A)) {
            results[i].elem_A.innerHTML = placeholder_not_possible
        } else if (!isFinite(results[i].value_A)) {
            results[i].elem_A.innerHTML = placeholder_infinity
        } else {
            results[i].elem_A.innerHTML = Math.round(results[i].value_A * 100) /100
        }

        if (results[i].value_B == null || isNaN(results[i].value_B)) {
            results[i].elem_B.innerHTML = placeholder_not_possible
        } else if (!isFinite(results[i].value_A)) {
            results[i].elem_A.innerHTML = placeholder_not_possible
        } else {
            results[i].elem_B.innerHTML = Math.round(results[i].value_B * 100) /100
        }
    }
}

// function to let users pic whch metrics to display
function set_metrics(checkbox) {
    var checkboxes = [
        {cb:1 , class: "visability_sensi_speci"},
        {cb:2 , class: "visability_miss_fale"},
        {cb:3 , class: "visability_ppv_npv"},
        {cb:4 , class: "visability_fdr_for"},
        {cb:5 , class: "visability_plr_nlr"},
        {cb:6 , class: "visability_dodds_youden"},
        {cb:7 , class: "visability_accu_F1"},
    ];

    //check if elem is visible, if not show, if yes hide
    var elems = document.querySelectorAll("." + checkboxes[checkbox-1].class);
    for (var i = 0; i < elems.length; i++) {
        if (elems[i].style.display === "none") {
            elems[i].style.display = "";
        } else {
            elems[i].style.display = "none";
        }
    }

    //Resize the chart canvas, and calc the results (if an example is picked)
    resize_canvas();
    calc();
}

// called on button press to copy the text inside the "url_textfield"-elem (settings)
function copyText() {
    // Get the input element
    var textField = document.getElementById('url_textfield');
    textField.select();
    document.execCommand('copy');
}

// make changes to labeld or fairness mode visible in the general interface
function modified_settings() {
    // labels
    label_A = document.getElementById("name_group_a").value
    label_B = document.getElementById("name_group_b").value
    label_C = document.getElementById("name_group_c").value
    label_scale_X = document.getElementById("name_axis_x").value
    label_scale_Y = document.getElementById("name_axis_y").value

    //separator-mode
    separator_mode = document.getElementById("switch_separator_mode").value

    //fairness-mode
    var checked = document.getElementById("switch_fairness").checked
    if (checked == true) {
        document.getElementById("name_group_c").disabled = false
        fairness_mode = "true"
    
    } else if (checked == false) {
        document.getElementById("name_group_c").disabled = true
        fairness_mode = "false"
    }

    // generate copyable url for settings()
    generate_url();

    // reload chart without animations
    scatterChart.options.animation = false;
    generate_data();
}

// Event-Listener that triggers when settings are closed, an re-enabled the animations for the chart
var settings_elem = document.getElementById('settings');
settings_elem.addEventListener('hide.bs.modal', function () {
    scatterChart.options.animation = true;
    generate_data();
});

// generate url to copy from settings
function generate_url() {
    //get current URL
    var currentUrl = window.location.href;
    var indexOfQuestionMark = currentUrl.indexOf('?');
    if (indexOfQuestionMark > -1) {
        // If there is a "?" in the URL, return the substring before it.
        currentUrl = currentUrl.substring(0, indexOfQuestionMark);
    }

    // add parameters to url
    var checked = document.getElementById("switch_fairness").checked
    new_url = currentUrl +"?vara="+label_A+"&"+"varb="+label_B+"&"+"varc="+label_C+"&"+"mx="+label_scale_X+"&"+"my="+label_scale_Y+"&"+"fair="+checked+"&"+"sepm="+separator_mode;

    // copy URL to text-input in settings for user to copy
    document.getElementById("url_textfield").value = new_url
}

/***✨Beauty-Stuff✨***/
// Resize Canvas
window.addEventListener('resize', resize_canvas);
resize_canvas();
function resize_canvas () {
    var tests_container_elem_height = document.getElementById('tests_container').clientHeight;
    var button_height = 31//document.getElementById('btn_reset_separator').clientHeight;
    var canvas_elem = document.getElementById('chart_container_inner')

    // check width, to determine if orientation is horizontal (e.g. the "results" are displayed on the left, not below the chart)
    if (window.innerWidth >= 1200) {
        canvas_elem.style.height = tests_container_elem_height - button_height +"px"
    } else if (window.innerWidth >= 992) {
        canvas_elem.style.height = "500px"
    } else {
        canvas_elem.style.height = "300px"
    }
    
}

// change cursor on hover
function change_cursor_on_hover(mousemove) {
    const cursor_position = scatterChart.getElementsAtEventForMode(mousemove, 'nearest', {intersect: true}, true);

    if (cursor_position[0]) {
        const datasetIndex = cursor_position[0].datasetIndex;

        // Check if the cursor is over the third dataset (blue line, data_C)
        if (datasetIndex === 2) {
            if (separator_mode == '1d') {
                mousemove.target.style.cursor = 'col-resize';
            } else if (separator_mode == '2d') {
                mousemove.target.style.cursor = 'grab';
            }
        } else {
            mousemove.target.style.cursor = 'default';
        }
    } else {
        mousemove.target.style.cursor = 'default';
    }
}

scatterChart.canvas.addEventListener('mousemove', (e) => {
        change_cursor_on_hover(e);
})

// activate the buttons & replace Headlines, Text when an example is picked by the user
function activate_interface(example) {
    // Replace headlines for cards
    document.getElementById('var_title_A').innerHTML = label_A;
    document.getElementById('con_table_A_VarA').innerHTML = label_A;
    document.getElementById('con_table_B_VarA').innerHTML = label_A;
    document.getElementById('con_table_A_pos_results').innerHTML = label_A;
    document.getElementById('con_table_A_neg_results').innerHTML = label_B;
    
    document.getElementById('var_title_B').innerHTML = label_B;
    document.getElementById('con_table_A_VarB').innerHTML = label_B;
    document.getElementById('con_table_B_VarB').innerHTML = label_B;
    document.getElementById('con_table_B_pos_results').innerHTML = label_B;
    document.getElementById('con_table_B_neg_results').innerHTML = label_A;

    // activate Button
    document.getElementById('btn_reset_separator').disabled = false;

}

// Set Popover content depending on the title
set_popover_content ()
function set_popover_content () {
    // define the content (defintion, synonyms, calculation) for the popovers
    var content = [
        /*Sensitivity*/
        {
            definition: "Sensitivity is the probability of a positive test result if the criterion in fact applies.", 
            synonyms: "recall, power (1-β), true positive rate, hit rate, probability of detection.", 
            calculation: '<span class="popover_calc_color_TP">TP</span> / <span class="popover_calc_color_P">P</span>'
        },
        /*Specificity*/
        {
            definition: "Specificity is the probability of a negative test result if the criterion does not apply.", 
            synonyms: "true negative rate, selectivity.", 
            calculation: '<span class="popover_calc_color_TN">TN</span> / <span class="popover_calc_color_N">N</span>'
        },
        /*Miss Rate*/
        {
            definition: "The miss rate is the probability of a negative test result if the criterion in fact applies. In other words:: it's the rate of false negatives.", 
            synonyms: "false negative rate, β", 
            calculation: '<span class="popover_calc_color_FN">FN</span> / <span class="popover_calc_color_P">P</span>'
        },
        /*False Alarm Rate*/
        {
            definition: "The false alarm rate is the probability of a positive test result if the criterion does not apply. In other words:: it's the rate of false positives.", 
            synonyms: "false positive rate, fall-out", 
            calculation: '<span class="popover_calc_color_FP">FP</span> / <span class="popover_calc_color_N">N</span>'
        },
        /*Positive Predictive Value*/
        {
            definition: "The PPV is the probability that the criterion in fact applies in the event of a positive test result.", 
            synonyms: "precision", 
            calculation: '<span class="popover_calc_color_TP">TP</span> / <span class="popover_calc_color_PP">PP</span>'
        },
        /*Negative Predictive Value*/
        {
            definition: "The NPV is the probability that the criterion does not apply in the event of a negative test result.", 
            synonyms: "/", 
            calculation: '<span class="popover_calc_color_TN">TN</span> / <span class="popover_calc_color_PN">PN</span>'
        },
        /*False Discovery Rate*/
        {
            definition: "The FDR is the probability that the criterion does not apply in the event of a positive test result.", 
            synonyms: "/", 
            calculation: '<span class="popover_calc_color_FP">FP</span> / <span class="popover_calc_color_PP">PP</span>'
        },
        /*False Omission Rate*/
        {
            definition: "The FOR is the probability that the criterion does in fact apply in the event of a negative test result.", 
            synonyms: "/", 
            calculation: '<span class="popover_calc_color_FN">FN</span> / <span class="popover_calc_color_PN">PN</span>'
        },
        /*Positive Likelihood Ratio*/
        {
            definition: "The LR+ is the ratio of the probability of a positive test if the criterion applies, to the probability of a positive test result if the criterion does not apply. In other words, a <i>larger</i> LR+ suggests that the test is more effective at correctly identifying individuals meeting the criterion.", 
            synonyms: "LR+, likelihood ratio for positive results", 
            calculation: '<br>sensitivity / false alarm rate <br>= (<span class="popover_calc_color_TP">TP</span> / <span class="popover_calc_color_P">P</span>) / (<span class="popover_calc_color_FP">FP</span> / <span class="popover_calc_color_N">N</span>)'
        },
        /*Negative Likelihood Ratio*/
        {
            definition: "The LR- is the ratio of the probability of a negative test if the criterion applies, to the probability of a negative test result if the criterion does not apply. In other words, a <i>smaller</i> LR- suggests that the test is more effective at correctly identifying individuals <i>not</i> meeting the criterion.", 
            synonyms: "LR-, likelihood ratio for negative results", 
            calculation: '<br>miss rate / specificity <br>= (<span class="popover_calc_color_FN">FN</span> / <span class="popover_calc_color_P">P</span>) / (<span class="popover_calc_color_TN">TN</span> / <span class="popover_calc_color_N">N</span>)'
        },
        /*Accuracy*/
        {
            definition: 'Accuracy is, as the name suggests, a measure of the performance of the test. For this purpose, the number of true classifications (both types!) is compared to the total number of cases. Accuracy depends on the prevalence of the criterion. Accuracy can be misleading, e.g. when using imbalanced datasets, where the prevalence of the criterion is low. In such cases, a high accuracy might be achieved by simply classifying most samples as negatives.', 
            synonyms: "top-1 accuracy,  rand accuracy, rand index, rand measure", 
            calculation: '<br>True classifications / Σ cases <br>= (<span class="popover_calc_color_TP">TP</span> + <span class="popover_calc_color_TN">TN</span>) / (<span class="popover_calc_color_P">P</span> + <span class="popover_calc_color_N">N</span>)'
        },
        /*F1-Score*/
        {
            definition: "The F<sub>1</sub>-Score is an alternative measure of accuracy, that combines sensitivity and precision (PPV) into a harmonic mean. It is often used in machine learning and is particularly useful in the case of unbalanced groups.", 
            synonyms: "(balanced) F-score, F<sub>⁠β</sub>", 
            calculation: '<br>2 / (Sensitivity<sup>-1</sup> + PPV<sup>-1</sup>) <br>= 2 * <span class="popover_calc_color_TP">TP</span> / (2 * <span class="popover_calc_color_TP">TP</span> + <span class="popover_calc_color_FP">FP</span> + <span class="popover_calc_color_FN">FN</span>)'
        },
        /*Diagnostic Odds Ratio*/
        {
            definition: "Like the accuracy (or F1 & J), the DOR is a measure of the performance of the test. However, it is independent of the prevalence and is calculated as an odds ratio. It ranges from 0 - ∞. Whereby larger values (1<) indicate a better performance of the test.", 
            synonyms: "/", 
            calculation: '<br>Pos. likelihood ratio / Neg. likelihood ratio <br>= <b>(</b>sensitivity <b>/</b> false alarm rate<b>)</b> / <b>(</b>miss rate <b>/</b> specificity<b>)</b> <br>= <b>[</b>(<span class="popover_calc_color_TP">TP</span> / <span class="popover_calc_color_P">P</span>) <b>/</b> (<span class="popover_calc_color_FP">FP</span> / <span class="popover_calc_color_N">N</span>)<b>]</b> / <b>[</b>(<span class="popover_calc_color_FN">FN</span> / <span class="popover_calc_color_P">P</span>) <b>/</b> (<span class="popover_calc_color_TN">TN</span> / <span class="popover_calc_color_N">N</span>)<b>]</b>'
        },
        /*Youden's J*/
        {
            definition: "Youden's J is another measure of a test's performance.  Youden's J can be useful when balancing the trade-off between specificity and sensitivity. The measure ranges from 0 to 1, with a higher value indicating a better discriminatory performance of the test.", 
            synonyms: "J-statistic, Youden's index, informedness", 
            calculation: '<br>sensitivity + sensitivity - 1 <br>= (<span class="popover_calc_color_TP">TP</span> / <span class="popover_calc_color_P">P</span>) + (<span class="popover_calc_color_TN">TN</span> / <span class="popover_calc_color_N">N</span>) - 1'
        },
    ]
    const definition_Elements = document.querySelectorAll('definition');

    // set the content of the popovers with variable example-text, depending on the example picked by the user
    var keywords = [
        {keyword: "Sensitivity", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[0].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[0].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[0].calculation+'</div></div>',
        ]},
        {keyword: "Specificity", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[1].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[1].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[1].calculation+'</div></div>',               
        ]},
        {keyword: "Miss Rate", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[2].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[2].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[2].calculation+'</div></div>',
        ]},
        {keyword: "False Alarm Rate", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[3].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[3].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[3].calculation+'</div></div>',
        ]},
        {keyword: "Positive Predictive Value", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[4].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[4].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[4].calculation+'</div></div>',
        ]},
        {keyword: "Negative Predictive Value", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[5].definition+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[5].calculation+'</div></div>',
        ]},
        {keyword: "False Discovery Rate", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[6].definition+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[6].calculation+'</div></div>',
        ]},
        {keyword: "False Omission Rate", content: [
            '<div class="row"><div class="col-md-6 p-1"><b>Definition</b>: '+content[7].definition+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[7].calculation+'</div></div>',
        ]},
        {keyword: "Positive Likelihood Ratio", content: [
            '<div class="row"><div class="col-md-12 p-1"><b>Definition</b>: '+content[8].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[8].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[8].calculation+'</div></div>',
        ]},
        {keyword: "Negative Likelihood Ratio", content: [
            '<div class="row"><div class="col-md-12 p-1"><b>Definition</b>: '+content[9].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[9].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[9].calculation+'</div></div>',
        ]},
        {keyword: "Accuracy", content: [
            '<div class="row"><div class="col-md-12 p-1"><b>Definition</b>: '+content[10].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[10].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[10].calculation+'</div></div>',
        ]},
        {keyword: "F1-Score", content: [
            '<div class="row"><div class="col-md-12 p-1"><b>Definition</b>: '+content[11].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[11].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[11].calculation+'</div></div>',
        ]},
        {keyword: "Diagnostic Odds Ratio", content: [
            '<div class="row"><div class="col-md-12 p-1"><b>Definition</b>: '+content[12].definition+'</div><div class="col-md-12 p-1"><b>Calculation</b>: '+content[12].calculation+'</div></div>',
        ]},
        {keyword: "Youden's J", content: [
            '<div class="row"><div class="col-md-12 p-1"><b>Definition</b>: '+content[13].definition+'</div><div class="col-md-6 p-1"><b>Synonyms</b>: '+content[13].synonyms+'</div><div class="col-md-6 p-1"><b>Calculation</b>: '+content[13].calculation+'</div></div>',
        ]},
    ]

    // set the content of popovers
    definition_Elements.forEach((element) => {
        var originalTitle = element.getAttribute('data-bs-original-title');

        for (var i in keywords) {
            if (keywords[i].keyword == originalTitle) {
                element.setAttribute('data-bs-content', keywords[i].content[0]);
            }
        }
    })

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl)
    })
}

// render colorfull overlay in the contingency table, while defintion popovers are active
function show_colours_calc_table (status, metric) {
    var elems_a = [
        {name: "p", elem: document.getElementById("con_table_A_VarA_outer"), color: "#22b14c"},
        {name: "n", elem: document.getElementById("con_table_A_VarB_outer"), color: "#3f48cc"},
        {name: "pp", elem: document.getElementById("con_table_A_pos_results_outer"), color: "#ede102"},
        {name: "pn", elem: document.getElementById("con_table_A_neg_results_outer"), color: "#ed1c24"},
        {name: "tp", elem: document.getElementById("con_table_A_true_pos"), color: "#b5e61d"},
        {name: "fp", elem: document.getElementById("con_table_A_false_pos"), color: "#00a2e8"},
        {name: "fn", elem: document.getElementById("con_table_A_false_neg"), color: "#ff7f27"},
        {name: "tn", elem: document.getElementById("con_table_A_true_neg"), color: "#a349a4"},
    ]
    var elems_b = [
        {name: "p", elem: document.getElementById("con_table_B_VarB_outer"), color: "#22b14c"},
        {name: "n", elem: document.getElementById("con_table_B_VarA_outer"), color: "#3f48cc"},
        {name: "pp", elem: document.getElementById("con_table_B_pos_results_outer"), color: "#ede102"},
        {name: "pn", elem: document.getElementById("con_table_B_neg_results_outer"), color: "#ed1c24"},
        {name: "tp", elem: document.getElementById("con_table_B_true_pos"), color: "#b5e61d"},
        {name: "fp", elem: document.getElementById("con_table_B_false_pos"), color: "#00a2e8"},
        {name: "fn", elem: document.getElementById("con_table_B_false_neg"), color: "#ff7f27"},
        {name: "tn", elem: document.getElementById("con_table_B_true_neg"), color: "#a349a4"},
    ]

    var elems_to_show = []

    if (metric == "sens") {
        elems_to_show.push("tp", "p")

    } else if (metric == "speci") {
        elems_to_show.push("tn", "n")

    } else if (metric == "missrate") {
        elems_to_show.push("fn", "p")

    } else if (metric == "fale") {
        elems_to_show.push("fp", "n")

    } else if (metric == "ppv") {
        elems_to_show.push("tp", "pp")

    } else if (metric == "npv") {
        elems_to_show.push("tn", "pn")

    } else if (metric == "fdr") {
        elems_to_show.push("fp", "pp")

    } else if (metric == "for") {
        elems_to_show.push("fn", "pn")

    } else if (metric == "plr") {
        elems_to_show.push("tp", "p", "fp", "n")

    } else if (metric == "nlr") {
        elems_to_show.push("fn", "p", "tn", "n")

    } else if (metric == "diag") {
        elems_to_show.push("tp", "p", "fp", "n", "fn", "tn")

    } else if (metric == "youden") {
        elems_to_show.push("tp", "p", "tn", "n")

    } else if (metric == "accu") {
        elems_to_show.push("tp", "tn", "p", "n")

    } else if (metric == "f1") {
        elems_to_show.push("tp", "fp","fn")

    }

    if (status == "show") {
        for (var i in elems_to_show) {
            for (var j in elems_a) {
                if (elems_a[j].name == elems_to_show[i]) {
                    elems_a[j].elem.style.color = elems_a[j].color
                }
            }
            for (var j in elems_b) {
                if (elems_b[j].name == elems_to_show[i]) {
                    elems_b[j].elem.style.color = elems_b[j].color
                }
            }
        }
    } else {
        for (var i in elems_a) {
            elems_a[i].elem.style.color = ""
        }
        for (var q in elems_b) {
            elems_b[q].elem.style.color = ""
        }
    }
}