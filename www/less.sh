#!/usr/bin/perl -w
use File::Basename;
use Term::ANSIColor;
use Cwd;

my $currdir = getcwd;

my $lessc = '/Users/ldiqual/node_modules/less/bin/lessc'; # Path to LESSC
my $lesspath = "${currdir}/stylesheets/less";
my $csspath = "${currdir}/stylesheets";
my $current_timestamp = 0;

chdir($lesspath) or die "Error in changing dir $lesspath\n";
my $modif = 0;
my $bypass = 0;
my $full_compile = 0;

print "-- Compiling every LESS file.\n";
while (1)
{
  opendir($dir, $lesspath);

  while ( ($file = readdir($dir)) )
  {
    my($filename, undef, $ftype) = fileparse($file, '.less');
    my($dev,$ino,$mode,$nlink,$uid,$gid,$rdev,$size,
       $atime,$mtime,$ctime,$blksize,$blocks) = stat($file);

    if ((($ftype eq '.less' && $mtime > $current_timestamp) || $bypass == 1) && $file ne "." && $file ne "..")
    {
      if ($filename eq "functions" || $filename eq "variables")
      {
        if ($current_timestamp != 0 && $bypass == 0){
          $full_compile = 1;
        }
      } else {
        my $command = $lessc.' '.$file.' '. $csspath.'/'. $filename .".css \n";
        print $file.' > '. $csspath.'/'. $filename .".css \n";
        system $command;
        $modif = 1;
      }
    }
  }
  if ($full_compile == 0 && $bypass == 1){
    $bypass = 0;
  }
  if ($full_compile == 1){
    print "-- A change has been detected in a crucial file - recompiling.\n";
    $bypass = 1;
    $full_compile = 0;
  }
  if ($modif == 1){
    print "\n";
    $current_timestamp = `date '+%s'`;
    $modif = 0;
  }

  closedir($dir);
  sleep(1);
}

