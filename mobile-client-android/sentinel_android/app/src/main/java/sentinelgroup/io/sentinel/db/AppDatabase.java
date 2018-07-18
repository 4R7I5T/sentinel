package sentinelgroup.io.sentinel.db;

import android.arch.persistence.room.Database;
import android.arch.persistence.room.Room;
import android.arch.persistence.room.RoomDatabase;
import android.content.Context;
import android.util.Log;

import sentinelgroup.io.sentinel.db.dao.BalanceEntryDao;
import sentinelgroup.io.sentinel.db.dao.GasEstimateEntryDao;
import sentinelgroup.io.sentinel.db.dao.PinEntryDao;
import sentinelgroup.io.sentinel.db.dao.VpnListEntryDao;
import sentinelgroup.io.sentinel.db.dao.VpnUsageEntryDao;
import sentinelgroup.io.sentinel.network.model.Chains;
import sentinelgroup.io.sentinel.network.model.GasEstimateEntity;
import sentinelgroup.io.sentinel.network.model.PinEntity;
import sentinelgroup.io.sentinel.network.model.VpnListEntity;
import sentinelgroup.io.sentinel.network.model.VpnUsageEntity;

/**
 * Room Database for storing all the essential application data in it's table defined by the various DAO's.
 */
@Database(entities = {Chains.class, GasEstimateEntity.class, PinEntity.class, VpnListEntity.class, VpnUsageEntity.class},
        version = 6,
        exportSchema = false)
public abstract class AppDatabase extends RoomDatabase {
    private static final String LOG_TAG = AppDatabase.class.getSimpleName();
    // For Singleton instantiation
    private static final Object LOCK = new Object();
    private static final String DATABASE_NAME = "sentinel_db";
    private static AppDatabase sInstance;

    public static AppDatabase getInstance(Context context) {
        Log.d(LOG_TAG, "Getting the database");
        if (sInstance == null) {
            synchronized (LOCK) {
                sInstance = Room
                        .databaseBuilder(context.getApplicationContext(),
                                AppDatabase.class, AppDatabase.DATABASE_NAME)
                        .fallbackToDestructiveMigration()
                        .build();
                Log.d(LOG_TAG, "Made new database");
            }
        }
        return sInstance;
    }

    // The associated DAOs for the database
    public abstract PinEntryDao getPinEntryDao();

    public abstract VpnListEntryDao getVpnListEntryDao();

    public abstract GasEstimateEntryDao getGasEstimateEntryDao();

    public abstract VpnUsageEntryDao getVpnUsageEntryDao();

    public abstract BalanceEntryDao getBalanceEntryDao();
}