import React from 'react';
import {
    MuiThemeProvider, Step, Stepper, StepLabel, RaisedButton, FlatButton, TextField, RadioButtonGroup,
    RadioButton, Slider, Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn,
    Snackbar, Checkbox
} from 'material-ui';
import { Grid, Row, Col } from 'react-flexbox-grid';
import { getMixerNodesList, getMixerToAddress, startMix } from '../Actions/AccountActions';
import { getPrivateKey, getGasCost, ethTransaction, tokenTransaction } from '../Actions/TransferActions';
import ArrowForwardIcon from 'material-ui/svg-icons/hardware/keyboard-arrow-right';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

const muiTheme = getMuiTheme({
    slider: {
        selectionColor: '#2f3245'
    },
    stepper: {
        iconColor: '#2f3245'
    }
})


class MixerComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            finished: false,
            stepIndex: 0,
            minValue: 0,
            maxValue: 0,
            pools: [
                {
                    'account_addr': '0x869',
                    'service_charge': 25,
                    'balances': {
                        'eth': 21,
                        'sent': 12
                    }
                },
                {
                    'account_addr': '0x897',
                    'service_charge': 12,
                    'balances': {
                        'eth': 32,
                        'sent': 90
                    }
                },
                {
                    'account_addr': '0x949',
                    'service_charge': 15,
                    'balances': {
                        'eth': 10,
                        'sent': 75
                    }
                },
                {
                    'account_addr': '0x929',
                    'service_charge': 15,
                    'balances': {
                        'eth': 10,
                        'sent': 75
                    }
                },
                {
                    'account_addr': '0x939',
                    'service_charge': 15,
                    'balances': {
                        'eth': 10,
                        'sent': 75
                    }
                },
                {
                    'account_addr': '0x919',
                    'service_charge': 15,
                    'balances': {
                        'eth': 10,
                        'sent': 75
                    }
                }
            ],
            destAddress: '',
            amount: 0,
            unit: 'SENT',
            password: '',
            nextDisabled: true,
            selectedRow: null,
            snackOpen: false,
            snackMessage: '',
            mixerToAddr: ''
        };
    }

    isSelected = (index) => {
        return this.state.selectedRow.indexOf(index) !== -1;
    };

    handleNext = () => {
        const { stepIndex } = this.state;
        if (stepIndex === 0) this.getMixerNodes();
        else if (stepIndex === 1) this.getMixerTo();
        else {
            this.initiateMix();
        }
    };

    getMixerNodes = () => {
        let self = this;
        const { stepIndex } = this.state;
        let eth, sent;
        eth = this.state.unit === 'ETH' ? this.state.amount * Math.pow(10, 18) : 0;
        sent = this.state.unit === 'SENT' ? this.state.amount * Math.pow(10, 8) : 0;
        let body = {
            eth: eth,
            sent: sent
        }
        getMixerNodesList(body, function (err, data) {
            self.setState({
                stepIndex: stepIndex + 1,
                finished: stepIndex >= 2,
                nextDisabled: self.state.selectedRow === null
            });
        })
    }

    getMixerTo = () => {
        let self = this;
        const { stepIndex } = this.state;
        let selectedAddr = this.state.pools[this.state.selectedRow].account_addr;
        getMixerToAddress(selectedAddr, function (err, data) {
            self.setState({
                stepIndex: stepIndex + 1,
                finished: stepIndex >= 2,
                nextDisabled: true,
                mixerToAddr: ''
            });
        })
    }

    initiateMix = () => {
        let self = this;
        getPrivateKey(self.state.password, self.props.lang, function (err, privateKey) {
            if (err) {
                self.setState({
                    snackOpen: true,
                    snackMessage: err.message
                })
            }
            else {
                let amount;
                let unit = self.state.unit;
                if (unit === 'ETH') amount = self.state.amount * Math.pow(10, 18)
                else amount = self.state.amount * Math.pow(10, 8)
                getGasCost(self.props.local_address, self.state.mixerToAddr, amount, unit, function (gasLimit) {
                    if (unit === 'ETH') {
                        ethTransaction(self.props.local_address, self.state.mixerToAddr, amount, 20 * (10 ** 9), gasLimit, privateKey, function (data) {
                            self.mainTransaction(data)
                        })
                    }
                    else {
                        tokenTransaction(self.props.local_address, self.state.mixerToAddr, amount, 20 * (10 ** 9), gasLimit, privateKey, function (data) {
                            self.mainTransaction(data)
                        })
                    }
                })
            }
        })
    }

    mainTransaction = (tx_data) => {
        let self = this;
        let net;
        if (this.props.isTest)
            net = 'rinkeby'
        else net = 'main'
        let body = {
            account_addr: this.props.local_address,
            to_address: this.state.mixerToAddr,
            destination_address: this.state.destAddress,
            delay_in_seconds: (this.state.minValue) * (60 * 60),
            coin_symbol: this.state.unit,
            tx_data: tx_data,
            net: net
        }
        startMix(body, function (err, tx_addr) {
            self.setState({
                stepIndex: 0,
                finished: false,
                nextDisabled: true
            });
        });
    }

    handleMinSlider = (event, value) => {
        this.setState({ minValue: value })
    }

    handleMaxSlider = (event, value) => {
        this.setState({ maxValue: value })
    }

    handlePrev = () => {
        const { stepIndex } = this.state;
        if (stepIndex > 0) {
            this.setState({ stepIndex: stepIndex - 1, nextDisabled: false, password: '' });
        }
    };

    destAddressChange = (event, destAddress) => {
        this.setState({ destAddress })
        let trueAddress = destAddress.match(/^0x[a-zA-Z0-9]{40}$/)
        if (trueAddress !== null) {
            this.setState({ nextDisabled: false })
        }
        else {
            this.setState({ nextDisabled: true })
        }
    }

    handleRowSelection = (index) => {
        console.log("Ind..", index, this.state.nextDisabled)
        if (this.state.selectedRow === index)
            this.setState({
                selectedRow: null,
                nextDisabled: true
            });
        else {
            this.setState({
                selectedRow: index,
                nextDisabled: false
            });
        }
    };

    snackRequestClose = () => {
        this.setState({
            snackOpen: false,
        });
    };


    getStepContent(stepIndex) {
        switch (stepIndex) {
            case 0:
                return (<div>
                    <span style={styles.formHeading}>Amount</span>
                    <TextField
                        type="number"
                        underlineShow={false} fullWidth={true}
                        inputStyle={styles.textInputStyle}
                        style={styles.textStyle}
                        onChange={(event, amount) => this.setState({ amount })}
                        value={this.state.amount}
                        underlineShow={false} fullWidth={true}
                    />
                    <Row style={{ marginTop: 12, marginBottom: 20 }}>
                        <Col xs={3}>
                            <span style={styles.formHeading}>Select Token to Mix</span>
                            <RadioButtonGroup name="selectToken" onChange={(event, unit) => { this.setState({ unit }) }}
                                defaultSelected={this.state.unit} style={{ marginTop: 12 }}>
                                <RadioButton
                                    value="SENT"
                                    label="SENT"
                                    iconStyle={{ fill: '#2f3245' }}
                                />
                                <RadioButton
                                    value="ETH"
                                    label="ETH"
                                    iconStyle={{ fill: '#2f3245' }}
                                />
                            </RadioButtonGroup>
                        </Col>
                        <Col xsOffset={1} xs={3}>
                            <span style={styles.formHeading}>Minimum Time Delay</span>
                            <Slider
                                min={0}
                                max={48}
                                step={1}
                                value={this.state.minValue}
                                onChange={this.handleMinSlider}
                                sliderStyle={{ marginBottom: 0, marginTop: 12, height: 'auto' }}
                            />
                            <span style={{ fontSize: 16, fontWeight: 600, color: '#253245', letterSpacing: 2, marginTop: 27, position: 'absolute' }}>
                                {this.state.minValue} hrs</span>
                        </Col>
                        <Col xsOffset={1} xs={3}>
                            <span style={styles.formHeading}>Maximum Time Delay</span>
                            <Slider
                                min={this.state.minValue}
                                max={54}
                                step={1}
                                value={this.state.maxValue > this.state.minValue ? this.state.maxValue : this.state.minValue}
                                onChange={this.handleMaxSlider}
                                sliderStyle={{ marginBottom: 0, marginTop: 12, height: 'auto' }}
                            />
                            <span style={{ fontSize: 16, fontWeight: 600, color: '#253245', letterSpacing: 2, marginTop: 27, position: 'absolute' }}>
                                {this.state.maxValue > this.state.minValue ? this.state.maxValue : this.state.minValue} hrs</span>
                        </Col>
                    </Row>
                    <span style={styles.formHeading}>Destination Address</span>
                    <TextField
                        hintText="Example: 0x0E5090ef14B5195cE5a4E28403ad25bA08D0Ad45"
                        hintStyle={{ bottom: 8, paddingLeft: 10, letterSpacing: 2, fontSize: 14 }}
                        style={{ height: 42, marginTop: 15 }}
                        onChange={this.destAddressChange.bind(this)}
                        value={this.state.destAddress}
                        underlineShow={false} fullWidth={true}
                        inputStyle={styles.textInputStyle}
                    />
                </div>)
            case 1:
                return (<div
                    style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', height: 370, overflowY: 'auto', padding: '2%' }}>
                    {/* <Table onRowSelection={this.handleRowSelection}>
                        <TableHeader>
                            <TableRow>
                                <TableHeaderColumn style={styles.headerColumnStyle}>Service Charge</TableHeaderColumn>
                                <TableHeaderColumn style={styles.headerColumnStyle}>SENT Balance</TableHeaderColumn>
                                <TableHeaderColumn style={styles.headerColumnStyle}>ETH Balance</TableHeaderColumn>
                            </TableRow>
                        </TableHeader>
                        <TableBody deselectOnClickaway={false}>
                            {this.state.pools.map((row, index) => (
                                <TableRow key={index} selected={this.isSelected(index)}>
                                    <TableRowColumn>{row.service_charge}</TableRowColumn>
                                    <TableRowColumn>{row.balances.eth}</TableRowColumn>
                                    <TableRowColumn>{row.balances.sent}</TableRowColumn>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table> */}
                    {this.state.pools.map((row, index) => (
                        <div style={{ margin: '2% 5%', backgroundColor: '#d2e2dd', padding: '3%', boxShadow: 'grey 0px 0px 15px 1px' }}>
                            <span>
                                <Checkbox
                                    label=""
                                    checked={this.state.selectedRow === index}
                                    onCheck={this.handleRowSelection.bind(this, index)}
                                />
                                <p>Service Charge: {row.service_charge}</p>
                                <p>ETH Balance: {row.balances.eth}</p>
                                <p>SENT Balance: {row.balances.sent}</p>
                            </span>
                        </div>
                    ))}

                </div>)
            case 2:
                return (<div>
                    <span style={styles.detailsHeadingStyle}>Destination Address: </span>
                    <span style={styles.detailsStyle}>{this.state.destAddress}</span><br />
                    <span style={styles.detailsHeadingStyle}>Service Charge: </span>
                    <span style={styles.detailsStyle}>{this.state.pools[this.state.selectedRow].service_charge} + Gas Price</span><br />
                    <span style={styles.detailsHeadingStyle}>Amount: </span>
                    <span style={styles.detailsStyle}>{this.state.amount} {this.state.unit}</span>
                    <TextField
                        type="password"
                        hintText="Enter Keystore Password to Confirm"
                        hintStyle={{ bottom: 8, paddingLeft: 10, letterSpacing: 2, fontSize: 14 }}
                        onChange={(event, password) => this.setState({ password, nextDisabled: password === '' })}
                        value={this.state.password}
                        underlineShow={false} fullWidth={true}
                        inputStyle={styles.textInputStyle}
                        style={{ height: 42, marginTop: '5%' }}
                    />
                </div>)
            default:
                return 'Wrong Page';
        }
    }

    render() {
        const { finished, stepIndex, selectedRow, nextDisabled } = this.state;
        const contentStyle = { margin: '16px' };

        return (
            <MuiThemeProvider muiTheme={muiTheme}>
                <div style={{ width: '100%', maxWidth: 950, margin: 'auto' }}>
                    <Stepper activeStep={stepIndex} style={{ width: '20%', marginTop: 10 }}>
                        <Step>
                            <StepLabel style={stepIndex > 0 ? styles.preStepStyle : styles.activeStepStyle}>
                                Enter Details to Mix</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel style={stepIndex >= 1 ?
                                (stepIndex === 1 ? styles.activeStepStyle : styles.preStepStyle) : styles.disabledStepStyle}>
                                List of Pools</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel style={stepIndex < 2 ? styles.disabledStepStyle : styles.activeStepStyle}>
                                Confirmation</StepLabel>
                        </Step>
                    </Stepper>
                    <div style={contentStyle}>
                        {finished ? (
                            <p>
                                <a
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        this.setState({ stepIndex: 0, finished: false });
                                    }}
                                >
                                    Click here
              </a> to reset the example.
            </p>
                        ) : (
                                <div style={stepIndex === 2 ? { display: 'flex', alignItems: 'center', padding: '10%', textAlign: 'center', height: 400, flexDirection: 'column' } : {}}>
                                    <p style={stepIndex === 2 ? { width: '80%' } : { width: '100%' }}>{this.getStepContent(stepIndex)}</p>
                                    <div style={{ marginTop: 12, flexDirection: 'row' }}>
                                        <FlatButton
                                            label="Back"
                                            disabled={stepIndex === 0}
                                            onClick={this.handlePrev}
                                            style={{
                                                marginRight: 12, border: '1px solid #00bcd4',
                                                borderRadius: 5, display: stepIndex === 0 ? 'none' : 'inline'
                                            }}
                                        />
                                        <RaisedButton
                                            label={stepIndex === 2 ? 'Confirm' : 'Next'}
                                            primary={true}
                                            disabled={nextDisabled || (stepIndex === 1 && selectedRow === null)}
                                            onClick={this.handleNext}
                                            buttonStyle={nextDisabled || (stepIndex === 1 && selectedRow === null) ?
                                                { backgroundColor: '#c7c9d4' } : { backgroundColor: '#2f3245' }}
                                            style={{
                                                borderRadius: 5,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        <Snackbar
                            open={this.state.snackOpen}
                            message={this.state.snackMessage}
                            autoHideDuration={2000}
                            onRequestClose={this.snackRequestClose}
                            style={{ marginBottom: '2%' }}
                        />
                    </div>
                </div >
            </MuiThemeProvider >
        );
    }
}

const styles = {
    formHeading: {
        fontSize: 16,
        fontWeight: 600,
        color: '#253245',
        letterSpacing: 2
    },
    textInputStyle: {
        padding: 10,
        fontWeight: 'bold',
        color: '#2f3245',
        border: '1px solid #00bcd4',
        borderRadius: '8px'
    },
    textStyle: {
        height: 42,
        marginTop: 12,
        marginBottom: 20
    },
    detailsHeadingStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    detailsStyle: {
        fontSize: 16,
        letterSpacing: 0.5
    },
    headerColumnStyle: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 14
    },
    activeStepStyle: {
        fontSize: 14,
        paddingRight: 20,
        height: 45,
        color: 'black',
        backgroundColor: '#ddd',
        borderBottomRightRadius: 20,
        borderTopRightRadius: 20
    },
    preStepStyle: {
        fontSize: 14,
        paddingRight: 20,
        height: 45,
        color: 'black',
        backgroundColor: '#ddd'
    },
    disabledStepStyle: {
        fontSize: 14,
        paddingRight: 20,
        height: 45
    }
}

export default MixerComponent;