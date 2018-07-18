package sentinelgroup.io.sentinel.ui.activity;

import android.app.Dialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.RemoteException;
import android.support.design.widget.NavigationView;
import android.support.v4.app.Fragment;
import android.support.v4.view.GravityCompat;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBar;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.SwitchCompat;
import android.support.v7.widget.Toolbar;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.CompoundButton;
import android.widget.TextView;
import android.widget.Toast;

import de.blinkt.openvpn.LaunchVPN;
import de.blinkt.openvpn.VpnProfile;
import de.blinkt.openvpn.core.ConnectionStatus;
import de.blinkt.openvpn.core.IOpenVPNServiceInternal;
import de.blinkt.openvpn.core.OpenVPNService;
import de.blinkt.openvpn.core.ProfileManager;
import de.blinkt.openvpn.core.VpnStatus;
import sentinelgroup.io.sentinel.R;
import sentinelgroup.io.sentinel.SentinelApp;
import sentinelgroup.io.sentinel.ui.custom.OnGenericFragmentInteractionListener;
import sentinelgroup.io.sentinel.ui.custom.OnVpnConnectionListener;
import sentinelgroup.io.sentinel.ui.custom.ProfileAsync;
import sentinelgroup.io.sentinel.ui.dialog.DoubleActionDialogFragment;
import sentinelgroup.io.sentinel.ui.dialog.ProgressDialogFragment;
import sentinelgroup.io.sentinel.ui.dialog.SingleActionDialogFragment;
import sentinelgroup.io.sentinel.ui.fragment.VpnConnectedFragment;
import sentinelgroup.io.sentinel.ui.fragment.VpnSelectFragment;
import sentinelgroup.io.sentinel.ui.fragment.WalletFragment;
import sentinelgroup.io.sentinel.util.AppConstants;
import sentinelgroup.io.sentinel.util.AppPreferences;
import sentinelgroup.io.sentinel.util.Logger;

import static sentinelgroup.io.sentinel.util.AppConstants.DOUBLE_ACTION_DIALOG_TAG;
import static sentinelgroup.io.sentinel.util.AppConstants.PROGRESS_DIALOG_TAG;
import static sentinelgroup.io.sentinel.util.AppConstants.SINGLE_ACTION_DIALOG_TAG;

public class DashboardActivity extends AppCompatActivity implements CompoundButton.OnCheckedChangeListener,
        OnGenericFragmentInteractionListener, OnVpnConnectionListener, VpnStatus.StateListener, DoubleActionDialogFragment.OnDialogActionListener {

    private String mIntentExtra;
    private boolean mHasActivityResult;

    private DrawerLayout mDrawerLayout;
    private NavigationView mNavView;
    private Toolbar mToolbar;
    private SwitchCompat mSwitchNet;
    private TextView mSwitchState;
    private ProgressDialogFragment mPrgDialog;
    private MenuItem mMenuVpn, mMenuWallet;
    private ProfileAsync profileAsync;
    private IOpenVPNServiceInternal mService;
    private ServiceConnection mConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName className, IBinder service) {
            mService = IOpenVPNServiceInternal.Stub.asInterface(service);
        }

        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mService = null;
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);
        shouldShowHelper();
        initView();
        loadVpnFragment(null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // setup VPN listeners & services
        VpnStatus.addStateListener(this);
        Intent intent = new Intent(this, OpenVPNService.class);
        intent.setAction(OpenVPNService.START_SERVICE);
        bindService(intent, mConnection, Context.BIND_AUTO_CREATE);
        // check intent and take necessary actions
        if (getIntent().getExtras() != null) {
            mIntentExtra = getIntent().getStringExtra(AppConstants.EXTRA_NOTIFICATION_ACTIVITY);
        }
        if (mIntentExtra != null && mIntentExtra.equals(AppConstants.HOME)) {
            loadVpnFragment(null);
        }
        // initialize/update the TESTNET switch
        setupTestNetSwitch();
        // check and toggle TESTNET switch state (if needed) when returning from other activity
        toggleTestNetSwitch(!(getSupportFragmentManager().findFragmentById(R.id.fl_container) instanceof VpnConnectedFragment));
    }

    @Override
    protected void onPause() {
        super.onPause();
        unbindService(mConnection);
    }

    @Override
    protected void onStop() {
        VpnStatus.removeStateListener(this);
        super.onStop();
    }

    @Override
    public void onBackPressed() {
        if (mDrawerLayout != null && mDrawerLayout.isDrawerOpen(GravityCompat.START))
            mDrawerLayout.closeDrawers();
        else
            super.onBackPressed();
    }

    /*
     *  Show the Helper screens when the user is opening the app for the first time
     */
    private void shouldShowHelper() {
        if (!AppPreferences.getInstance().getBoolean(AppConstants.PREFS_IS_HELPER_SHOWN)) {
            onLoadNextActivity(new Intent(this, HelperActivity.class), AppConstants.REQ_HELPER_SCREENS);
        }
    }

    /*
     * Set the TESTNET switch state, switch text and the state text based on the TESTNET state
     * value stored in the shared preferences.
     */
    private void setupTestNetSwitch() {
        boolean isActive = AppPreferences.getInstance().getBoolean(AppConstants.PREFS_IS_TEST_NET_ACTIVE);
        mSwitchNet.setChecked(isActive);
        mSwitchNet.setText(R.string.test_net);
        mSwitchState.setText(getString(R.string.test_net_state, getString(isActive ? R.string.active : R.string.deactive)));
    }

    /*
     * Instantiate all the views used in the XML and perform other instantiation steps (if needed)
     */
    private void initView() {
        mToolbar = findViewById(R.id.toolbar);
        mSwitchNet = findViewById(R.id.switch_net);
        mSwitchState = findViewById(R.id.switch_state);
        mDrawerLayout = findViewById(R.id.drawer_layout);
        mPrgDialog = ProgressDialogFragment.newInstance(true);
        mNavView = findViewById(R.id.navigation_view);
        // set drawer scrim color
        mDrawerLayout.setScrimColor(Color.TRANSPARENT);
        // instantiate toolbar
        setupToolbar();
        // add listeners
        mSwitchNet.setOnCheckedChangeListener(this);
        mNavView.getHeaderView(0).findViewById(R.id.ib_back).setOnClickListener(v -> mDrawerLayout.closeDrawers());
        mNavView.setNavigationItemSelectedListener(
                menuItem -> {
                    // set item as selected to persist highlight
                    menuItem.setChecked(true);
                    // handle item click
                    handleNavigationItemClick(menuItem.getItemId());
                    // close drawer when item is tapped
                    mDrawerLayout.closeDrawers();
                    return true;
                });
    }

    /*
     * Set the toolbar as the default actionbar and set the home indicator
     */
    private void setupToolbar() {
        setSupportActionBar(mToolbar);
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.setDisplayShowTitleEnabled(false);
            actionBar.setDisplayHomeAsUpEnabled(true);
            actionBar.setHomeAsUpIndicator(R.drawable.ic_hamburger_menu);
        }
    }

    /*
     * Handle click action on the Navigation items
     */
    private void handleNavigationItemClick(int itemItemId) {
        switch (itemItemId) {
            case R.id.nav_tx_history:
                startActivityForResult(new Intent(this, TxHistoryActivity.class), AppConstants.REQ_TX_HISTORY);
                break;
            case R.id.nav_vpn_history:
                startActivityForResult(new Intent(this, VpnHistoryActivity.class), AppConstants.REQ_VPN_HISTORY);
                break;
            case R.id.nav_reset_pin:
                startActivityForResult(new Intent(this, ResetPinActivity.class), AppConstants.REQ_RESET_PIN);
                break;
            case R.id.nav_help:
                startActivityForResult(new Intent(this, GenericListActivity.class).putExtra(AppConstants.EXTRA_REQ_CODE, AppConstants.REQ_HELP), AppConstants.REQ_CODE_NULL);
                break;
            case R.id.nav_social_links:
                startActivityForResult(new Intent(this, GenericListActivity.class).putExtra(AppConstants.EXTRA_REQ_CODE, AppConstants.REQ_SOCIAL_LINKS), AppConstants.REQ_CODE_NULL);
                break;
            case R.id.nav_language:
                startActivityForResult(new Intent(this, GenericListActivity.class).putExtra(AppConstants.EXTRA_REQ_CODE, AppConstants.REQ_LANGUAGE), AppConstants.REQ_LANGUAGE);
                break;
            case R.id.nav_logout:
                showDoubleActionDialog(AppConstants.TAG_LOGOUT, -1, getString(R.string.logout_desc), R.string.logout, android.R.string.cancel);
        }
    }

    /**
     * Initialize the Progress Dialog which needs to be shown while loading a screen
     *
     * @param isHalfDim [boolean] Denotes whether the dialog's background should be transparent or
     *                  dimmed
     * @param iMessage  [String] The message text which needs to be shown as Loading message
     */
    private void showProgressDialog(boolean isHalfDim, String iMessage) {
        toggleProgressDialogState(true, isHalfDim, iMessage == null ? getString(R.string.generic_loading_message) : iMessage);
    }

    /**
     * Hide the Progress Dialog window if it is currently being displayed
     */
    private void hideProgressDialog() {
        toggleProgressDialogState(false, false, null);
    }

    /*
     * Helper method to initialize & update the attributes of the Progress Dialog and to toggle
     * it's visibility
     */
    private void toggleProgressDialogState(boolean isShow, boolean isHalfDim, String iMessage) {
        Fragment aFragment = getSupportFragmentManager().findFragmentByTag(PROGRESS_DIALOG_TAG);
        if (isShow) {
            if (aFragment == null) {
                if (!isHalfDim)
                    mPrgDialog.setNoDim();
                mPrgDialog.setLoadingMessage(iMessage);
                mPrgDialog.show(getSupportFragmentManager(), PROGRESS_DIALOG_TAG);
            } else {
                mPrgDialog.updateLoadingMessage(iMessage);
            }
        } else {
            if (aFragment != null)
                mPrgDialog.dismiss();
        }
    }

    /**
     * Shows an Error dialog with a Single button
     *
     * @param iMessage [String] The error message to be displayed
     */
    protected void showSingleActionError(String iMessage) {
        showSingleActionError(-1, iMessage, -1);
    }

    /**
     * Shows an Error dialog with a Single button
     *
     * @param iTitleId          [int] The resource id of the title to be displayed
     * @param iMessage          [String] The error message to be displayed
     * @param iPositiveOptionId [int] The resource id of the button text
     */
    protected void showSingleActionError(int iTitleId, String iMessage, int iPositiveOptionId) {
        Fragment aFragment = getSupportFragmentManager().findFragmentByTag(SINGLE_ACTION_DIALOG_TAG);
        int aTitleId = iTitleId != -1 ? iTitleId : R.string.please_note;
        int aPositiveOptionText = iPositiveOptionId != -1 ? iPositiveOptionId : android.R.string.ok;
        if (aFragment == null)
            SingleActionDialogFragment.newInstance(aTitleId, iMessage, aPositiveOptionText)
                    .show(getSupportFragmentManager(), SINGLE_ACTION_DIALOG_TAG);
    }

    /**
     * Shows an Error dialog with a Two buttons
     *
     * @param iTag     [String] The Tag assigned to the fragment when it's added to the container
     * @param iMessage [String] The error message to be displayed
     */
    protected void showDoubleActionDialog(String iTag, String iMessage) {
        showDoubleActionDialog(iTag, -1, iMessage, -1, -1);
    }

    /**
     * Shows an Error dialog with a Two buttons
     *
     * @param iTag              [String] The Tag assigned to the fragment when it's added to the container
     * @param iTitleId          [int] The resource id of the title to be displayed
     * @param iMessage          [String] The error message to be displayed
     * @param iPositiveOptionId [int] The resource id of the positive button text
     * @param iNegativeOptionId [int] The resource id of the negative button text
     */
    protected void showDoubleActionDialog(String iTag, int iTitleId, String iMessage, int iPositiveOptionId, int iNegativeOptionId) {
        Fragment aFragment = getSupportFragmentManager().findFragmentByTag(DOUBLE_ACTION_DIALOG_TAG);
        int aTitleId = iTitleId != -1 ? iTitleId : R.string.please_note;
        int aPositiveOptionId = iPositiveOptionId != -1 ? iPositiveOptionId : android.R.string.ok;
        int aNegativeOptionId = iNegativeOptionId != -1 ? iNegativeOptionId : android.R.string.cancel;
        if (aFragment == null)
            DoubleActionDialogFragment.newInstance(iTag, aTitleId, iMessage, aPositiveOptionId, aNegativeOptionId)
                    .show(getSupportFragmentManager(), DOUBLE_ACTION_DIALOG_TAG);
    }

    /**
     * Replace the existing fragment in the container with the new fragment passed in this method's
     * parameters
     *
     * @param iFragment [Fragment] The fragment which needs to be displayed
     */
    private void loadFragment(Fragment iFragment) {
        toggleTestNetSwitch(!(iFragment instanceof VpnConnectedFragment));
        getSupportFragmentManager().beginTransaction().replace(R.id.fl_container, iFragment).commit();
    }

    /*
     * Replaces the existing fragment in the container with VpnSelectFragment
     */
    private void loadVpnFragment(String iMessage) {
        loadFragment(VpnSelectFragment.newInstance(iMessage));
    }

    /*
     * Replaces the existing fragment in the container with WalletFragment
     */
    private void loadWalletFragment() {
        loadFragment(WalletFragment.newInstance());
    }

    /*
     * Toggles the state of the TESTNET switch
     */
    private void toggleTestNetSwitch(boolean isEnabled) {
        mSwitchNet.setEnabled(isEnabled);
        if (!isEnabled) {
            mSwitchNet.setChecked(true);
            AppPreferences.getInstance().saveBoolean(AppConstants.PREFS_IS_TEST_NET_ACTIVE, true);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_dashboard, menu);
        mMenuVpn = menu.findItem(R.id.action_vpn);
        mMenuWallet = menu.findItem(R.id.action_wallet);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        Fragment aFragment = getSupportFragmentManager().findFragmentById(R.id.fl_container);
        switch (item.getItemId()) {
            case android.R.id.home:
                mDrawerLayout.openDrawer(GravityCompat.START);
                return true;

            case R.id.action_vpn:
                if ((aFragment instanceof WalletFragment)) {
                    toggleItemState(item.getItemId());
                    loadVpnFragment(null);
                }
                return true;

            case R.id.action_wallet:
                if (!(aFragment instanceof WalletFragment)) {
                    toggleItemState(item.getItemId());
                    loadWalletFragment();
                }
                return true;

            default:
                return super.onOptionsItemSelected(item);
        }
    }

    /*
     * Update the Options Menu icon when a menu is clicked
     */
    private void toggleItemState(int iItemId) {
        mMenuVpn.setIcon(iItemId == R.id.action_vpn ? R.drawable.menu_vpn_selected : R.drawable.menu_vpn_unselected);
        mMenuWallet.setIcon(iItemId == R.id.action_wallet ? R.drawable.menu_wallet_selected : R.drawable.menu_wallet_unselected);
    }

    /**
     * Copies the string to the clipboard and shows a Toast on completing it
     *
     * @param iCopyString  [String] The text which needs to be copied to the clipboard
     * @param iToastTextId [int] The resource id of the toast message.
     */
    private void copyToClipboard(String iCopyString, int iToastTextId) {
        ClipboardManager clipboard = (ClipboardManager) this.getSystemService(CLIPBOARD_SERVICE);
        if (clipboard != null) {
            ClipData clip = ClipData.newPlainText(getString(R.string.app_name), iCopyString);
            Toast.makeText(this, iToastTextId, Toast.LENGTH_SHORT).show();
            clipboard.setPrimaryClip(clip);
        }
    }

    /*
     * Load the VPN profile to which connection is to be established, observe it's load state and
     * perform the necessary action
     */
    private void setupProfile(String iPath) {
        if (!SentinelApp.isVpnConnected) {
            profileAsync = new ProfileAsync(this, iPath, new ProfileAsync.OnProfileLoadListener() {
                @Override
                public void onProfileLoadSuccess() {
                    startVPN();
                }

                @Override
                public void onProfileLoadFailed(String iMessage) {
                    Toast.makeText(DashboardActivity.this, "Init Fail" + iMessage, Toast.LENGTH_SHORT).show();
                }
            });
            profileAsync.execute();
        }
    }

    /*
     * Start VPN connection after the VPN profile is loaded successfully
     */
    private void startVPN() {
        try {
            ProfileManager pm = ProfileManager.getInstance(this);
            VpnProfile profile = pm.getProfileByName(Build.MODEL);//
            startVPNConnection(profile);
        } catch (Exception ex) {
            SentinelApp.isVpnConnected = false;
        }
    }

    /*
     * Launch the activity which handles the VPN connection by passing it the VPN profile
     */
    private void startVPNConnection(VpnProfile profile) {
        Intent intent = new Intent(getApplicationContext(), LaunchVPN.class);
        intent.putExtra(LaunchVPN.EXTRA_KEY, profile.getUUID().toString());
        intent.setAction(Intent.ACTION_MAIN);
        startActivity(intent);
    }

    /*
     * Stop the VPN service and delete the last used VPN profile
     */
    private void stopVPNConnection() {
        ProfileManager.setConntectedVpnProfileDisconnected(this);
        if (mService != null) {
            try {
                mService.stopVPN(false);
            } catch (RemoteException e) {
                VpnStatus.logException(e);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Fragment aFragment = getSupportFragmentManager().findFragmentById(R.id.fl_container);
        switch (requestCode) {
            case AppConstants.REQ_VPN_HISTORY:
                if (resultCode == RESULT_OK) {
                    if (!(aFragment instanceof WalletFragment))
                        loadVpnFragment(null);
                }
                break;
            case AppConstants.REQ_RESET_PIN:
                if (resultCode == RESULT_OK) {
                    Toast.makeText(this, R.string.reset_pin_success, Toast.LENGTH_SHORT).show();
                }
                break;
            case AppConstants.REQ_VPN_CONNECT:
                if (resultCode == RESULT_OK) {
                    mHasActivityResult = true;
                }
                break;
            case AppConstants.REQ_VPN_PAY:
                if (resultCode == RESULT_OK) {
                    loadVpnFragment(null);
                }
                break;
            case AppConstants.REQ_VPN_INIT_PAY:
                if (resultCode == RESULT_OK) {
                    showSingleActionError(getString(R.string.init_vpn_pay_success_message));
                }
                break;
            case AppConstants.REQ_HELPER_SCREENS:
                if (resultCode == RESULT_OK) {
                    AppPreferences.getInstance().saveBoolean(AppConstants.PREFS_IS_HELPER_SHOWN, true);
                }
                break;
            case AppConstants.REQ_LANGUAGE:
                if (resultCode == RESULT_OK) {
                    refreshMenuTitles();
                    if (!(aFragment instanceof WalletFragment))
                        loadVpnFragment(null);
                    else
                        loadWalletFragment();
                }
                break;
        }
    }

    /*
     * Refresh the navigation menu titles after a new language is set
     */
    private void refreshMenuTitles() {
        Menu aMenu = mNavView.getMenu();
        MenuItem aMenuTxHistory = aMenu.findItem(R.id.nav_tx_history);
        aMenuTxHistory.setTitle(R.string.transaction_history);
        MenuItem aMenuVpnHistory = aMenu.findItem(R.id.nav_vpn_history);
        aMenuVpnHistory.setTitle(R.string.vpn_history);
        MenuItem aMenuResetPin = aMenu.findItem(R.id.nav_reset_pin);
        aMenuResetPin.setTitle(R.string.reset_pin);
        MenuItem aMenuHelp = aMenu.findItem(R.id.nav_help);
        aMenuHelp.setTitle(R.string.help);
        MenuItem aMenuSocialLinks = aMenu.findItem(R.id.nav_social_links);
        aMenuSocialLinks.setTitle(R.string.social_links);
        MenuItem aMenuLanguage = aMenu.findItem(R.id.nav_language);
        aMenuLanguage.setTitle(R.string.language);
        MenuItem aMenuLogout = aMenu.findItem(R.id.nav_logout);
        aMenuLogout.setTitle(R.string.logout);
    }

    /*
     * Logout user by clearing all the values in shared preferences and reloading the
     * LauncherActivity
     */
    private void logoutUser() {
        AppPreferences.getInstance().clearSavedData(this);
        startActivity(new Intent(this, LauncherActivity.class));
        finish();
    }

    // Listener implementations
    @Override
    public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
        AppPreferences.getInstance().saveBoolean(AppConstants.PREFS_IS_TEST_NET_ACTIVE, isChecked);
        mSwitchState.setText(getString(R.string.test_net_state, getString(isChecked ? R.string.active : R.string.deactive)));

        Fragment aFragment = getSupportFragmentManager().findFragmentById(R.id.fl_container);
        if (aFragment instanceof WalletFragment) {
            ((WalletFragment) aFragment).updateBalance(isChecked);
        } else if (!(aFragment instanceof VpnConnectedFragment))
            loadVpnFragment(null);
    }


    @Override
    public void onFragmentLoaded(String iTitle) {
        // Unimplemented interface method
    }

    @Override
    public void onShowProgressDialog(boolean isHalfDim, String iMessage) {
        showProgressDialog(isHalfDim, iMessage);
    }

    @Override
    public void onHideProgressDialog() {
        hideProgressDialog();
    }

    @Override
    public void onShowSingleActionDialog(String iMessage) {
        if (iMessage.equals(getString(R.string.free_token_requested)))
            showSingleActionError(R.string.yay, iMessage, R.string.thanks);
        else
            showSingleActionError(iMessage);
    }

    @Override
    public void onShowDoubleActionDialog(String iMessage, int iPositiveOptionId, int iNegativeOptionId) {
        showDoubleActionDialog(AppConstants.TAG_INIT_PAY, R.string.init_vpn_pay_title, iMessage, iPositiveOptionId, iNegativeOptionId);
    }

    @Override
    public void onCopyToClipboardClicked(String iCopyString, int iToastTextId) {
        copyToClipboard(iCopyString, iToastTextId);
    }

    @Override
    public void onLoadNextFragment(Fragment iNextFragment) {
        loadFragment(iNextFragment);
    }

    @Override
    public void onLoadNextActivity(Intent iIntent, int iReqCode) {
        if (iIntent != null)
            if (iReqCode != AppConstants.REQ_CODE_NULL)
                startActivityForResult(iIntent, iReqCode);
            else
                startActivity(iIntent);
    }

    @Override
    public void onVpnConnectionInitiated(String iVpnConfigFilePath) {
        loadFragment(VpnConnectedFragment.newInstance());
        setupProfile(iVpnConfigFilePath);
    }

    @Override
    public void onVpnDisconnectionInitiated() {
        SentinelApp.isVpnConnected = true;
        stopVPNConnection();
    }

    @Override
    public void onActionButtonClicked(String iTag, Dialog iDialog, boolean isPositiveButton) {
        Fragment aFragment = getSupportFragmentManager().findFragmentById(R.id.fl_container);
        if (isPositiveButton) {
            if (iTag.equals(AppConstants.TAG_INIT_PAY) && aFragment instanceof VpnSelectFragment)
                ((VpnSelectFragment) aFragment).makeInitPayment();
            else if (iTag.equals(AppConstants.TAG_LOGOUT))
                logoutUser();
        }
        iDialog.dismiss();
    }

    @Override
    public void updateState(String state, String logMessage, int localizedResId, ConnectionStatus level) {
        Logger.logError("VPN_STATE", state + " - " + logMessage + " : " + getString(localizedResId), null);
        runOnUiThread(() -> {
            Fragment aFragment = getSupportFragmentManager().findFragmentById(R.id.fl_container);
            if (state.equals("CONNECTED") || (state.equals("USER_VPN_PERMISSION"))) {
                SentinelApp.isVpnConnected = true;
            }
            // Called when the VPN connection terminates
            if (state.equals("NOPROCESS") || state.equals("USER_VPN_PERMISSION_CANCELLED")) {
                if (SentinelApp.isVpnConnected && !mHasActivityResult) {
                    SentinelApp.isVpnInitiated = false;
                    SentinelApp.isVpnConnected = false;
                    if (!(aFragment instanceof WalletFragment))
                        loadVpnFragment(state.equals("NOPROCESS") ? null : getString(localizedResId));
                }
            }
            // Called when user connects to a VPN node from other activity
            if (mHasActivityResult) {
                onVpnConnectionInitiated(AppPreferences.getInstance().getString(AppConstants.PREFS_CONFIG_PATH));
                mHasActivityResult = false;
            }
        });
    }

    @Override
    public void setConnectedVPN(String uuid) {
    }
}