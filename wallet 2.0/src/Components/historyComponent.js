import React from 'react';
import { historyLabel, historyValue, cardStyle, statusLabel, statusValue } from '../Assets/commonStyles';
import { historyStyles } from '../Assets/txhistory.styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import lang from '../Constants/language';
import { Card } from '@material-ui/core';
import '../Assets/commonStyles.css';

class History extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        let { date, to, from, gas, amount, status, tx, ownWallet, data, unit,gasUnit, language } = this.props;
        return (
            <Card className = "cardStyle">
                <div>
                    <label style={from !== ownWallet ? historyStyles.inStyle : historyStyles.outStyle}>{from !== ownWallet ?
                        lang[language].In : lang[language].Out}&nbsp;
                            <span style={historyValue}>{new Date(parseInt(date) * 1000).toLocaleString()}</span>

                    </label>

                    <label style={statusLabel}>{`${lang[language].Status}:`}&nbsp;
                    <span style={status === 'Success' ? historyStyles.inStyle : historyStyles.outStyle}>{lang[language][status]}</span></label>
                </div>
                <div>
                    <label style={historyLabel} >{from !== ownWallet ? `${lang[language].From}:` : `${lang[language].To}:`}&nbsp;
                            <span style={historyStyles.recepientStyle}>
                            {from !== ownWallet ? from : to}
                        </span></label>
                </div>

                <div>
                    <label style={historyLabel}>{`${lang[language].Amount}:`}&nbsp;<span style={historyValue}>{amount} {unit}</span></label>
                    <label style={historyLabel}>{`${lang[language].GasPrice}:`}&nbsp;<span style={historyValue}>{gas}</span></label>

                </div>
                <div>
                    <label style={historyLabel}>{`${lang[language].TxID}:`}&nbsp;<span style={historyValue}>{tx}</span></label>
                </div>
            </Card>
        )
    }
}

const mapDispatchToProps = (dispatch) => {

    return bindActionCreators({}, dispatch)
};

const mapStateToProps = ({ setLanguage }) => {

    return { language: setLanguage }
};

export default connect(mapStateToProps, mapDispatchToProps)(History);