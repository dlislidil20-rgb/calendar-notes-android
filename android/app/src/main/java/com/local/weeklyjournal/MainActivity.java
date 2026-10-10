package com.local.weeklyjournal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(JournalPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
