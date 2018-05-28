package sentinelgroup.io.sentinel.ui.activity;

import android.content.Intent;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.MenuItem;

import sentinelgroup.io.sentinel.R;
import sentinelgroup.io.sentinel.ui.fragment.RestoreKeystoreFragment;

public class RestoreKeystoreActivity extends SimpleBaseActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        loadFragment(RestoreKeystoreFragment.newInstance());
    }

    @Override
    public void loadFragment(Fragment iFragment) {
        getSupportFragmentManager().beginTransaction().replace(R.id.fl_container, iFragment).commit();
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            onBackPressed();
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onBackPressed() {
        Fragment aFragment = getSupportFragmentManager().findFragmentById(R.id.fl_container);
        if (aFragment instanceof RestoreKeystoreFragment) {
            startActivity(new Intent(this, LauncherActivity.class));
            finish();
        }
    }

    @Override
    public void onFragmentLoaded(String iTitle) {
        Fragment aFragment = getSupportFragmentManager().findFragmentById(R.id.fl_container);
        if (!(aFragment instanceof RestoreKeystoreFragment))
            hideBackIcon();
        setToolbarTitle(iTitle);
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
    public void onShowErrorDialog(String iError) {
        showSingleActionError(iError);
    }

    @Override
    public void onCopyToClipboardClicked(String iCopyString) {
        copyToClipboard(iCopyString);
    }

    @Override
    public void onLoadNextFragment(Fragment iNextFragment) {
        loadFragment(iNextFragment);
    }

    @Override
    public void onLoadNextActivity(Intent iIntent) {
        if (iIntent != null) {
            startActivity(iIntent);
            finish();
        }
    }
}