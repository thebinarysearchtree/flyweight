/*
 * Written by Alexey Tourbin <at@altlinux.org>.
 *
 * The author has dedicated the code to the public domain.  Anyone is free
 * to copy, modify, publish, use, compile, sell, or distribute the original
 * code, either in source code form or as a compiled binary, for any purpose,
 * commercial or non-commercial, and by any means.
 */
#include <assert.h>
#include <stdlib.h>
#include <string.h>

#define PCRE2_STATIC
#define PCRE2_CODE_UNIT_WIDTH 8
#include <pcre2.h>
#include <sqlite3ext.h>
SQLITE_EXTENSION_INIT1

typedef struct {
    const char *s;
    pcre2_code *p;
} cache_entry;

#ifndef CACHE_SIZE
#define CACHE_SIZE 16
#endif

static
char *pcre_error(int errorcode)
{
    /* PCRE2 requires a pre-sized buffer. 256 should be fine.
     * The error is always correctly truncated, so the worst that
     * can happen is a partial message.
     */
    static char err_buff[256];
    pcre2_get_error_message(errorcode, err_buff, sizeof(err_buff));
    return err_buff;
}

static
pcre2_code *re_compile_with_cache(sqlite3_context *ctx, const char *re)
{
    int i;
    int found = 0;
    cache_entry *cache = sqlite3_user_data(ctx);

    assert(cache);

    for (i = 0; i < CACHE_SIZE && cache[i].s; i++)
        if (strcmp(re, cache[i].s) == 0) {
            found = 1;
            break;
        }

    if (found) {
        if (i > 0) {
            /* Get the found entry */
            cache_entry c = cache[i];
            /* Move 0..i-1 up one - args are (dest, src, size) */
            memmove(cache + 1, cache, i * sizeof(cache_entry));
            /* Put the found entry at the start */
            cache[0] = c;
        }
    }
    else {
        /* Create a new entry */
        pcre2_code *pat;
        int errorcode;
        PCRE2_SIZE pos;
        char *emsg = NULL;
        uint32_t has_jit = 0;

        pat = pcre2_compile(re, PCRE2_ZERO_TERMINATED, PCRE2_ALT_BSUX | PCRE2_EXTRA_ALT_BSUX | PCRE2_UTF, &errorcode, &pos, NULL);
        if (!pat) {
            char *e2 = sqlite3_mprintf("%s: %s (offset %d)", re, pcre_error(errorcode), pos);
            sqlite3_result_error(ctx, e2, -1);
            sqlite3_free(e2);
            return NULL;
        }
        pcre2_config(PCRE2_CONFIG_JIT, &has_jit);
        if (has_jit) {
            errorcode = pcre2_jit_compile(pat, 0);
            if (errorcode) {
                char *e2 = sqlite3_mprintf("%s: %s", re, pcre_error(errorcode));
                sqlite3_result_error(ctx, e2, -1);
                sqlite3_free(e2);
                pcre2_code_free(pat);
                return NULL;
            }
        }
        /* Free the last cache entry if necessary */
        i = CACHE_SIZE - 1;
        if (cache[i].s) {
            free((char *)cache[i].s);
            assert(cache[i].p);
            pcre2_code_free(cache[i].p);
        }
        /* Move everything up to make space */
        memmove(cache + 1, cache, i * sizeof(cache_entry));
        cache[0].s = re;
        cache[0].p = pat;
    }

    return cache[0].p;
}

static
void regexp(sqlite3_context *ctx, int argc, sqlite3_value **argv)
{
    const char *re, *str;
    pcre2_code *p;
    pcre2_match_data *md;
    int rc;

    assert(argc == 2);

    re = (const char *) sqlite3_value_text(argv[0]);
    if (!re) {
	sqlite3_result_error(ctx, "no regexp", -1);
	return;
    }

    str = (const char *) sqlite3_value_text(argv[1]);
    if (!str) {
	sqlite3_result_error(ctx, "no string", -1);
	return;
    }

    p = re_compile_with_cache(ctx, re);
    if (!p)
        return;

    md = pcre2_match_data_create_from_pattern(p, NULL);
    if (!str) {
	sqlite3_result_error(ctx, "could not create match data block", -1);
	return;
    }
    rc = pcre2_match(p, str, PCRE2_ZERO_TERMINATED, 0, 0, md, NULL);
    sqlite3_result_int(ctx, rc >= 0);
}

int sqlite3_extension_init(sqlite3 *db, char **err, const sqlite3_api_routines *api)
{
	SQLITE_EXTENSION_INIT2(api)
	cache_entry *cache = calloc(CACHE_SIZE, sizeof(cache_entry));
	if (!cache) {
	    *err = "calloc: ENOMEM";
	    return 1;
	}
	sqlite3_create_function(db, "REGEXP", 2, SQLITE_UTF8, cache, regexp, NULL, NULL);
	return 0;
}